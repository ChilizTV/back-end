import { supabase } from '../config/supabase';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { 
    LiveStream, 
    CreateStreamRequest, 
    CreateStreamResponse,
    StreamListResponse,
    EndStreamRequest,
    EndStreamResponse,
    StreamMetadata
} from '../models/stream.model';
import { Socket } from 'socket.io';

export class StreamService {
    private ffmpegProcesses: Map<string, ChildProcess> = new Map();
    private streamSockets: Map<string, Socket> = new Map();
    private audioSockets: Map<string, net.Socket[]> = new Map(); // Store audio TCP sockets per stream
    private audioServers: Map<string, net.Server> = new Map(); // TCP servers for audio
    private audioPorts: Map<string, number> = new Map(); // Store audio port numbers
    private audioQueues: Map<string, Buffer[]> = new Map(); // Queue audio buffers when socket is full
    private readonly streamsDir: string;
    private readonly baseUrl: string;
    private nextAudioPort: number = 10000; // Start from port 10000 for audio
    private endingStreams: Set<string> = new Set();

    constructor() {
        this.streamsDir = path.join(process.cwd(), 'public', 'streams');
        const port = process.env.PORT || '3001';
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = process.env.HOST || 'localhost';
        this.baseUrl = process.env.STREAM_BASE_URL || `${protocol}://${host}:${port}`;
        
        // Ensure streams directory exists
        if (!fs.existsSync(this.streamsDir)) {
            fs.mkdirSync(this.streamsDir, { recursive: true });
            console.log(`📁 Created streams directory: ${this.streamsDir}`);
        }
        
        console.log(`📺 StreamService initialized:`);
        console.log(`   - Streams directory: ${this.streamsDir}`);
        console.log(`   - Base URL: ${this.baseUrl}`);
    }

    /**
     * Generate a unique stream key
     */
    private generateStreamKey(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `stream_${timestamp}_${random}`;
    }

    /**
     * Create a new stream entry in the database
     */
    async createStream(request: CreateStreamRequest): Promise<CreateStreamResponse> {
        try {
            console.log('🎥 Creating stream:', request);

            const streamKey = this.generateStreamKey();
            const streamDir = path.join(this.streamsDir, streamKey);
            
            // Create directory for this stream
            if (!fs.existsSync(streamDir)) {
                fs.mkdirSync(streamDir, { recursive: true });
            }

            const hlsPlaylistUrl = `${this.baseUrl}/streams/${streamKey}/playlist.m3u8`;

            // Insert stream into database
            const { data, error } = await supabase
                .from('live_streams')
                .insert({
                    match_id: request.matchId,
                    streamer_id: request.streamerId,
                    streamer_name: request.streamerName,
                    stream_key: streamKey,
                    hls_playlist_url: hlsPlaylistUrl,
                    status: 'active',
                    viewer_count: 0
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Database error:', error);
                return {
                    success: false,
                    error: `Database error: ${error.message}`
                };
            }

            const stream: LiveStream = {
                id: data.id,
                matchId: data.match_id,
                streamerId: data.streamer_id,
                streamerName: data.streamer_name,
                streamKey: data.stream_key,
                hlsPlaylistUrl: data.hls_playlist_url,
                status: data.status,
                viewerCount: data.viewer_count,
                createdAt: data.created_at,
                endedAt: data.ended_at
            };

            console.log('✅ Stream created:', stream.id);
            return {
                success: true,
                stream
            };

        } catch (error) {
            console.error('❌ Error creating stream:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Start streaming - initialize FFmpeg and prepare for receiving data
     */
    async startStreaming(streamKey: string, socket: Socket): Promise<void> {
        try {

            // Check if FFmpeg process already exists
            if (this.ffmpegProcesses.has(streamKey)) {
                console.warn(`⚠️ FFmpeg process already exists for ${streamKey}, skipping`);
                return;
            }

            const streamDir = path.join(this.streamsDir, streamKey);
            const playlistPath = path.join(streamDir, 'playlist.m3u8');

            // Ensure directory exists
            if (!fs.existsSync(streamDir)) {
                console.log(`📁 Creating stream directory: ${streamDir}`);
                fs.mkdirSync(streamDir, { recursive: true });
            } else {
                console.log(`📁 Stream directory already exists: ${streamDir}`);
            }

            // Store socket reference
            this.streamSockets.set(streamKey, socket);

            // Create TCP server for audio (works on all platforms: Windows, macOS, Linux)
            let audioPort: number | null = null;
            let audioServer: net.Server | null = null;
            let hasAudio = false;

            // Create TCP server for audio - wrap in Promise to wait for it to be ready
            const audioServerPromise = new Promise<{ port: number; server: net.Server } | null>((resolve) => {
                try {
                    audioPort = this.nextAudioPort++;
                    // Ensure we don't exceed reasonable port range
                    if (audioPort > 65535) {
                        audioPort = 10000;
                    }

                    audioServer = net.createServer((socket) => {
                        
                        // Initialize audio queue for this stream
                        this.audioQueues.set(streamKey, []);
                        
                        // Enable TCP_NODELAY to reduce latency
                        socket.setNoDelay(true);
                        
                        // Store audio socket for writing
                        const audioSockets = this.audioSockets.get(streamKey) || [];
                        audioSockets.push(socket);
                        this.audioSockets.set(streamKey, audioSockets);
                        
                        // Handle drain event to flush queue
                        socket.on('drain', () => {
                            const queue = this.audioQueues.get(streamKey);
                            if (queue && queue.length > 0 && !socket.destroyed && socket.writable) {
                                // Write all queued buffers
                                while (queue.length > 0 && !socket.destroyed && socket.writable) {
                                    const nextBuffer = queue.shift();
                                    if (nextBuffer) {
                                        // Convert Buffer to Uint8Array for socket.write
                                        const uint8Buffer = new Uint8Array(nextBuffer);
                                        const success = socket.write(uint8Buffer);
                                        if (!success) {
                                            // Still full, put it back
                                            queue.unshift(nextBuffer);
                                            break;
                                        }
                                    }
                                }
                            }
                        });

                        socket.on('end', () => {
                            console.log(`🎤 Audio client disconnected for stream ${streamKey}`);
                            // Remove socket from list
                            const sockets = this.audioSockets.get(streamKey) || [];
                            const index = sockets.indexOf(socket);
                            if (index > -1) {
                                sockets.splice(index, 1);
                                this.audioSockets.set(streamKey, sockets);
                            }
                            // Clear queue
                            this.audioQueues.delete(streamKey);
                        });

                        socket.on('error', (error) => {
                            console.error(`❌ Audio socket error for ${streamKey}:`, error);
                            // Remove socket from list
                            const sockets = this.audioSockets.get(streamKey) || [];
                            const index = sockets.indexOf(socket);
                            if (index > -1) {
                                sockets.splice(index, 1);
                                this.audioSockets.set(streamKey, sockets);
                            }
                            // Clear queue
                            this.audioQueues.delete(streamKey);
                        });
                    });

                    // Start listening on the port
                    audioServer.listen(audioPort, '127.0.0.1', () => {
                        console.log(`🎤 Audio TCP server listening on port ${audioPort} for stream ${streamKey}`);
                        hasAudio = true;
                        this.audioServers.set(streamKey, audioServer!);
                        this.audioPorts.set(streamKey, audioPort!);
                        resolve({ port: audioPort!, server: audioServer! });
                    });

                    audioServer.on('error', (error) => {
                        console.error(`❌ Error creating audio TCP server for ${streamKey}:`, error);
                        hasAudio = false;
                        resolve(null);
                    });

                } catch (error) {
                    console.error(`❌ Could not create audio TCP server:`, error);
                    hasAudio = false;
                    resolve(null);
                }
            });

            // Wait for audio server to be ready before starting FFmpeg
            const audioServerResult = await audioServerPromise;
            const finalAudioPort = audioServerResult?.port || null;
            const finalHasAudio = audioServerResult !== null;

            // Build FFmpeg command arguments
            // Match client frame rate (25 fps) and optimize for live streaming
            // Reduce input frame rate to improve performance
            const ffmpegArgs = [
                '-f', 'image2pipe',
                '-framerate', '25', // Match client frame rate (changed from 30)
                '-vcodec', 'mjpeg',
                '-i', 'pipe:0',
                '-threads', '2', // Limit threads to reduce CPU usage
                '-vsync', 'cfr', // Constant frame rate
            ];

            // Add audio input if audio server is available
            if (finalHasAudio && finalAudioPort !== null) {
                // FFmpeg will connect to our TCP server
                // Use tcp:// with listen=0 to make FFmpeg connect as client (not listen)
                // Note: We use 48000 Hz because that's what browsers typically use
                // Add TCP buffer size options to improve performance
                ffmpegArgs.push(
                    '-f', 's16le', // Signed 16-bit little-endian PCM
                    '-ar', '48000', // Sample rate - match browser default (48000 Hz)
                    '-ac', '1', // Mono audio
                    '-i', `tcp://127.0.0.1:${finalAudioPort}?listen=0&tcp_nodelay=1&recv_buffer_size=65536`, // Audio input from TCP server with larger buffer
                    '-c:a', 'aac', // Audio codec
                    '-b:a', '96k', // Reduced audio bitrate (from 128k) for better performance
                    '-ar', '48000', // Output sample rate - keep same as input
                    '-ac', '1' // Ensure mono output
                );
                console.log(`🎤 FFmpeg will connect to audio TCP server on port ${finalAudioPort}`);
            }

            // Add video encoding and HLS output
            ffmpegArgs.push(
                '-c:v', 'libx264',
                '-preset', 'ultrafast', // Fastest encoding
                '-tune', 'zerolatency', // Zero latency tuning
                '-g', '25', // GOP size matches frame rate for better streaming
                '-sc_threshold', '0',
                '-b:v', '1500k', // Reduced bitrate for better performance
                '-maxrate', '1500k',
                '-bufsize', '3000k',
                '-r', '25', // Output frame rate
                '-profile:v', 'baseline', // Baseline profile for better compatibility and speed
                '-level', '3.0', // Lower level for faster encoding
                '-f', 'hls',
                '-hls_time', '5', // Increased to 5 seconds for more stable segments
                '-hls_list_size', '8', // Reduced playlist size
                '-hls_flags', 'delete_segments',
                '-hls_segment_filename', path.join(streamDir, 'segment-%03d.ts'),
            );

            // Only add -an if no audio
            if (!finalHasAudio) {
                ffmpegArgs.push('-an'); // No audio
            }

            ffmpegArgs.push(playlistPath);

            // Spawn FFmpeg process
            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            if (finalHasAudio && finalAudioPort !== null) {
                
                // Wait up to 5 seconds for FFmpeg to connect to audio TCP server
                let ffmpegConnected = false;
                const checkConnection = setInterval(() => {
                    const sockets = this.audioSockets.get(streamKey) || [];
                    if (sockets.length > 0) {
                        ffmpegConnected = true;
                        clearInterval(checkConnection);
                    }
                }, 500);
                
                setTimeout(() => {
                    clearInterval(checkConnection);
                    if (!ffmpegConnected) {
                        console.warn(`⚠️ FFmpeg did not connect to audio TCP server within 5 seconds for ${streamKey}`);
                        console.warn(`⚠️ This might cause audio issues. Check FFmpeg logs for TCP connection errors.`);
                    }
                }, 5000);
            }

            // Handle FFmpeg stdout
            ffmpegProcess.stdout.on('data', (data) => {
                console.log(`📹 FFmpeg stdout (${streamKey}):`, data.toString());
            });

            // Handle FFmpeg stderr (FFmpeg outputs to stderr)
            ffmpegProcess.stderr.on('data', (data) => {
                const output = data.toString();
                
                // Log TCP connection attempts and errors
                if (output.includes('tcp://') || output.includes('Connection') || output.includes('connect')) {
                    console.log(`🎤 FFmpeg TCP connection info (${streamKey}):`, output.trim());
                }
                
                if (output.includes('error') || output.includes('Error')) {
                    console.error(`❌ FFmpeg stderr (${streamKey}):`, output);
                } else {
                    // Only log important FFmpeg messages to reduce noise
                    if (output.includes('frame=') || output.includes('time=') || output.includes('bitrate=')) {
                        console.log(`📹 FFmpeg (${streamKey}):`, output.trim().substring(0, 100));
                    }
                }
            });

            // Handle FFmpeg process events
            ffmpegProcess.stdin?.on('error', (error: any) => {
                if (error.code !== 'EPIPE') {
                    console.error(`❌ FFmpeg stdin error for ${streamKey}:`, error);
                }
            });

            ffmpegProcess.on('error', (error) => {
                console.error(`❌ FFmpeg spawn error for ${streamKey}:`, error);
                console.error(`❌ Error message:`, error.message);
                console.error(`❌ Error code:`, (error as any).code);
                this.handleStreamError(streamKey, error.message);
            });

            ffmpegProcess.on('exit', (code, signal) => {
                console.log(`🛑 FFmpeg exited for ${streamKey}: code=${code}, signal=${signal}`);
                this.ffmpegProcesses.delete(streamKey);
            });

            // Store FFmpeg process
            this.ffmpegProcesses.set(streamKey, ffmpegProcess);

            // Check if FFmpeg process started successfully after a short delay
            setTimeout(() => {
                const process = this.ffmpegProcesses.get(streamKey);
                if (process && !process.killed && process.pid) {
                } else {
                    console.warn(`⚠️ FFmpeg process may not have started correctly for ${streamKey}`);
                    console.warn(`⚠️ Process exists: ${!!process}, Killed: ${process?.killed}, PID: ${process?.pid}`);
                }
            }, 1000);

            setTimeout(() => {
                if (fs.existsSync(playlistPath)) {
                    const stats = fs.statSync(playlistPath);
                } else {
                    console.warn(`⚠️ Playlist file not yet created at: ${playlistPath}`);
                    // Check if directory exists
                    if (fs.existsSync(streamDir)) {
                        const files = fs.readdirSync(streamDir);
                    } else {
                        console.warn(`⚠️ Stream directory does not exist: ${streamDir}`);
                    }
                }
            }, 5000);

        } catch (error) {
            console.error(`❌ Error starting stream ${streamKey}:`, error);
            console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
            this.handleStreamError(streamKey, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * Handle incoming audio data from Socket.IO
     */
    handleStreamAudio(streamKey: string, audioData: number[]): void {
        try {
            const audioSockets = this.audioSockets.get(streamKey);
            
            if (!audioSockets || audioSockets.length === 0) {
                // No audio sockets connected yet (FFmpeg may not have connected)
                // This is normal at the start, skip silently
                return;
            }

            // Convert array to Int16Array buffer
            const int16Array = new Int16Array(audioData);
            const int16Buffer = Buffer.from(int16Array.buffer);
            
            // Write to all connected sockets (FFmpeg should be connected)
            let writtenCount = 0;
            let pendingCount = 0;
            let errorCount = 0;
            
            audioSockets.forEach((socket) => {
                if (socket && !socket.destroyed && socket.writable) {
                    try {
                        // Use Uint8Array to avoid TypeScript issues
                        const uint8Buffer = new Uint8Array(int16Buffer);
                        const success = socket.write(uint8Buffer);
                        if (success) {
                            writtenCount++;
                        } else {
                            // Socket buffer is full, add to queue
                            pendingCount++;
                            const queue = this.audioQueues.get(streamKey) || [];
                            queue.push(int16Buffer);
                            this.audioQueues.set(streamKey, queue);
                            
                            // Limit queue size to prevent memory issues (max 200 buffers)
                            if (queue.length > 200) {
                                console.warn(`⚠️ Audio queue too large (${queue.length} buffers) for ${streamKey}, dropping oldest`);
                                queue.shift(); // Remove oldest
                            }
                        }
                    } catch (error: any) {
                        // Ignore EPIPE errors (broken pipe) - happens when socket is closing
                        // This prevents crashes when FFmpeg closes the connection
                        if (error.code !== 'EPIPE') {
                            errorCount++;
                            console.error(`❌ Error writing to audio socket for ${streamKey}:`, error);
                        }
                        // Remove socket from list if broken
                        const sockets = this.audioSockets.get(streamKey) || [];
                        const index = sockets.indexOf(socket);
                        if (index > -1) {
                            sockets.splice(index, 1);
                            this.audioSockets.set(streamKey, sockets);
                        }
                    }
                } else {
                    errorCount++;
                }
            });
            
            // Log warnings if there are issues
            if (errorCount > 0 && writtenCount === 0 && pendingCount === 0) {
                console.warn(`⚠️ Failed to write audio data to ${errorCount} socket(s) for ${streamKey}`);
            }
        } catch (error) {
            console.error(`❌ Error handling audio data for ${streamKey}:`, error);
        }
    }

    /**
     * Handle incoming video data from Socket.IO
     */
    handleStreamData(streamKey: string, videoChunk: Buffer): void {
        try {
            const ffmpegProcess = this.ffmpegProcesses.get(streamKey);
            
            if (!ffmpegProcess) {
                console.warn(`⚠️ No FFmpeg process found for stream ${streamKey}`);
                console.warn(`📊 Available streams: ${Array.from(this.ffmpegProcesses.keys()).join(', ')}`);
                return;
            }

            // Check if process is still alive
            if (ffmpegProcess.killed || (ffmpegProcess.exitCode !== null && ffmpegProcess.exitCode !== undefined)) {
                console.warn(`⚠️ FFmpeg process for ${streamKey} has exited (code: ${ffmpegProcess.exitCode})`);
                this.ffmpegProcesses.delete(streamKey);
                return;
            }

            // Write chunk to FFmpeg stdin
            if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                try {
                    const success = ffmpegProcess.stdin.write(videoChunk);
                    if (!success) {
                        ffmpegProcess.stdin.once('drain', () => {
                        });
                    }
                } catch (error: any) {
                    // Ignore EPIPE errors (broken pipe) - happens when FFmpeg is closing
                    // This prevents crashes when FFmpeg process is terminated
                    if (error.code !== 'EPIPE') {
                        console.error(`❌ Error writing to FFmpeg stdin for ${streamKey}:`, error);
                    }
                    // Remove process from map if pipe is broken
                    this.ffmpegProcesses.delete(streamKey);
                }
            } else {
                console.warn(`⚠️ FFmpeg stdin not available for stream ${streamKey} (destroyed: ${ffmpegProcess.stdin?.destroyed})`);
            }

        } catch (error) {
            console.error(`❌ Error handling stream data for ${streamKey}:`, error);
        }
    }

    /**
     * End a stream
     */
    async endStream(request: EndStreamRequest): Promise<EndStreamResponse> {
        let streamKey: string | null = null;
        try {
            console.log(`🛑 Ending stream: ${request.streamId}`);

            // First, get the streamKey from the database
            const { data: streamData, error: fetchError } = await supabase
                .from('live_streams')
                .select('stream_key')
                .eq('id', request.streamId)
                .eq('streamer_id', request.streamerId)
                .single();

            if (fetchError || !streamData) {
                console.error('❌ Stream not found or unauthorized:', fetchError);
                return {
                    success: false,
                    error: 'Stream not found or unauthorized'
                };
            }

            streamKey = streamData.stream_key;

            // Ensure streamKey is valid
            if (!streamKey) {
                console.error('❌ Invalid streamKey');
                return {
                    success: false,
                    error: 'Invalid streamKey'
                };
            }

            // Prevent multiple calls to endStream for the same stream
            if (this.endingStreams.has(streamKey)) {
                console.warn(`⚠️ Stream ${streamKey} is already being ended`);
                return {
                    success: true
                };
            }

            this.endingStreams.add(streamKey);

            // Stop FFmpeg process using streamKey
            const ffmpegProcess = this.ffmpegProcesses.get(streamKey);
            if (ffmpegProcess) {
                if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                    // Handle EPIPE errors silently to prevent crashes
                    ffmpegProcess.stdin.on('error', (error: any) => {
                        if (error.code !== 'EPIPE') {
                            console.error(`❌ FFmpeg stdin error during cleanup for ${streamKey}:`, error);
                        }
                    });
                    ffmpegProcess.stdin.end();
                }
                ffmpegProcess.kill('SIGTERM');
                this.ffmpegProcesses.delete(streamKey);
            }

            // Clean up audio resources
            const audioServer = this.audioServers.get(streamKey);
            if (audioServer) {
                // Close all sockets first
                const audioSockets = this.audioSockets.get(streamKey) || [];
                audioSockets.forEach((socket) => {
                    if (!socket.destroyed) {
                        socket.destroy();
                    }
                });
                
                audioServer.close(() => {
                    console.log(`🎤 Audio TCP server closed for ${streamKey}`);
                });
                this.audioServers.delete(streamKey);
            }
            this.audioPorts.delete(streamKey);
            this.audioSockets.delete(streamKey);
            this.audioQueues.delete(streamKey); // Clear audio queue

            // Remove socket reference
            this.streamSockets.delete(streamKey);

            // Remove from ending streams set
            this.endingStreams.delete(streamKey);

            // Update database
            const { error } = await supabase
                .from('live_streams')
                .update({
                    status: 'ended',
                    ended_at: new Date().toISOString()
                })
                .eq('id', request.streamId)
                .eq('streamer_id', request.streamerId);

            if (error) {
                console.error('❌ Database error ending stream:', error);
                return {
                    success: false,
                    error: `Database error: ${error.message}`
                };
            }

            console.log(`✅ Stream ended: ${request.streamId} (streamKey: ${streamKey})`);
            return {
                success: true
            };

        } catch (error) {
            console.error('❌ Error ending stream:', error);
            // Clean up flag on error if streamKey was set
            if (streamKey) {
                this.endingStreams.delete(streamKey);
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get active streams for a match
     */
    async getActiveStreams(matchId: number): Promise<StreamListResponse> {
        try {
            
            const { data, error } = await supabase
                .from('live_streams')
                .select('*')
                .eq('match_id', matchId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) {
                console.error(`❌ Error fetching streams for match ${matchId}:`, error);
                return {
                    success: false,
                    streams: [],
                    error: error.message
                };
            }

            const streams: LiveStream[] = (data || []).map(row => ({
                id: row.id,
                matchId: row.match_id,
                streamerId: row.streamer_id,
                streamerName: row.streamer_name,
                streamKey: row.stream_key,
                hlsPlaylistUrl: row.hls_playlist_url,
                status: row.status,
                viewerCount: row.viewer_count,
                createdAt: row.created_at,
                endedAt: row.ended_at
            }));

            return {
                success: true,
                streams
            };

        } catch (error) {
            console.error(`❌ Exception fetching streams for match ${matchId}:`, error);
            return {
                success: false,
                streams: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get stream playlist URL
     */
    getStreamPlaylist(streamKey: string): string {
        return `${this.baseUrl}/streams/${streamKey}/playlist.m3u8`;
    }

    /**
     * Update viewer count
     */
    async updateViewerCount(streamId: string, count: number): Promise<void> {
        try {
            await supabase
                .from('live_streams')
                .update({ viewer_count: count })
                .eq('id', streamId);
        } catch (error) {
            console.error(`❌ Error updating viewer count for ${streamId}:`, error);
        }
    }

    /**
     * Handle stream errors
     */
    private handleStreamError(streamKey: string, error: string): void {
        console.error(`❌ Stream error for ${streamKey}:`, error);
        
        // Clean up FFmpeg process
        const ffmpegProcess = this.ffmpegProcesses.get(streamKey);
        if (ffmpegProcess) {
            try {
                if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                    ffmpegProcess.stdin.end();
                }
                ffmpegProcess.kill('SIGTERM');
            } catch (e) {
                // Ignore cleanup errors
            }
            this.ffmpegProcesses.delete(streamKey);
        }

        // Remove socket reference
        this.streamSockets.delete(streamKey);

        // Update database status
        (async () => {
            try {
                await supabase
                    .from('live_streams')
                    .update({
                        status: 'ended',
                        ended_at: new Date().toISOString()
                    })
                    .eq('stream_key', streamKey);
                console.log(`✅ Stream ${streamKey} marked as ended due to error`);
            } catch (err) {
                console.error(`❌ Error updating stream status:`, err);
            }
        })();
    }

    /**
     * Cleanup old stream files
     */
    async cleanupOldStreams(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
        try {
            console.log('🧹 Starting stream cleanup...');

            // Get ended streams older than 24 hours
            const { data: oldStreams } = await supabase
                .from('live_streams')
                .select('stream_key, ended_at')
                .eq('status', 'ended')
                .lt('ended_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

            let deletedCount = 0;

            if (oldStreams) {
                for (const stream of oldStreams) {
                    const streamDir = path.join(this.streamsDir, stream.stream_key);
                    
                    // Delete stream directory
                    if (fs.existsSync(streamDir)) {
                        fs.rmSync(streamDir, { recursive: true, force: true });
                        deletedCount++;
                    }
                }
            }

            console.log(`✅ Cleanup completed: ${deletedCount} streams deleted`);
            return {
                success: true,
                deletedCount
            };

        } catch (error) {
            console.error('❌ Error during cleanup:', error);
            return {
                success: false,
                deletedCount: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

export const streamService = new StreamService();
