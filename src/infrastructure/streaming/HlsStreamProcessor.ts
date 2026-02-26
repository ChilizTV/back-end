import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Writable } from 'stream';
import { injectable } from 'tsyringe';
import { logger } from '../logging/logger';

interface ActiveStream {
  ffmpeg: ChildProcess;
  videoStream: Writable;
  outputDir: string;
}

@injectable()
export class HlsStreamProcessor {
  private streams: Map<string, ActiveStream> = new Map();
  private readonly baseOutputPath: string;

  constructor() {
    this.baseOutputPath = path.join(process.cwd(), 'public', 'streams');
    if (!fs.existsSync(this.baseOutputPath)) {
      fs.mkdirSync(this.baseOutputPath, { recursive: true });
    }
  }

  startStream(streamKey: string): void {
    if (this.streams.has(streamKey)) {
      logger.warn('HLS stream already running', { streamKey });
      return;
    }

    const outputDir = path.join(this.baseOutputPath, streamKey);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const playlistPath = path.join(outputDir, 'playlist.m3u8');
    const segmentPattern = path.join(outputDir, 'segment_%03d.ts');

    // Video via stdin, silent audio via lavfi
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      // Video input (JPEG frames via stdin)
      '-f', 'image2pipe',
      '-framerate', '25',
      '-c:v', 'mjpeg',
      '-i', 'pipe:0',
      // Silent audio track so HLS players don't complain
      '-f', 'lavfi',
      '-i', 'anullsrc=r=44100:cl=mono',
      // Video encoding
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p',
      '-g', '50',
      '-sc_threshold', '0',
      '-b:v', '2500k',
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      // Audio encoding
      '-c:a', 'aac',
      '-b:a', '64k',
      // Stop when video ends (anullsrc is infinite)
      '-shortest',
      // HLS output
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '6',
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_filename', segmentPattern,
      playlistPath,
    ]);

    const videoStream = ffmpeg.stdin!;

    // Log all FFmpeg stderr output for debugging
    let stderrBuffer = '';
    ffmpeg.stderr?.on('data', (data: Buffer) => {
      stderrBuffer += data.toString();
      const msg = data.toString().trim();
      if (msg.toLowerCase().includes('error')) {
        logger.error('FFmpeg error', { streamKey, message: msg });
      }
    });

    ffmpeg.on('close', (code, signal) => {
      if (signal) {
        // Killed by signal (SIGTERM/SIGKILL) - normal when stream is stopped
        logger.info('FFmpeg process killed', { streamKey, signal });
      } else if (code !== 0) {
        logger.error('FFmpeg exited with error', { streamKey, code, stderr: stderrBuffer.slice(-500) });
      } else {
        logger.info('FFmpeg process exited cleanly', { streamKey });
      }
      this.cleanup(streamKey);
    });

    ffmpeg.on('error', (err) => {
      logger.error('FFmpeg spawn error', { streamKey, error: err.message });
      this.cleanup(streamKey);
    });

    this.streams.set(streamKey, { ffmpeg, videoStream, outputDir });

    logger.info('HLS stream processor started', { streamKey, outputDir });
  }

  sendVideoFrame(streamKey: string, jpegBuffer: Buffer): void {
    const stream = this.streams.get(streamKey);
    if (!stream || stream.videoStream.destroyed) return;

    try {
      stream.videoStream.write(jpegBuffer);
    } catch (error) {
      logger.error('Error writing video frame', {
        streamKey,
        error: (error as Error).message,
      });
    }
  }

  sendAudioData(streamKey: string, _pcmInt16Array: number[], _sampleRate: number): void {
    // Audio is currently handled via silent track (anullsrc).
    // Real audio mixing requires a more complex pipeline (future enhancement).
    return;
  }

  async stopStream(streamKey: string): Promise<void> {
    const stream = this.streams.get(streamKey);
    if (!stream) return;

    logger.info('Stopping HLS stream processor', { streamKey });

    // Close video input pipe - this signals FFmpeg to finish
    try {
      if (!stream.videoStream.destroyed) stream.videoStream.end();
    } catch {
      // ignore
    }

    // Wait for FFmpeg to finish (with timeout)
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        stream.ffmpeg.kill('SIGKILL');
        resolve();
      }, 5000);

      stream.ffmpeg.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.streams.delete(streamKey);
    logger.info('HLS stream processor stopped', { streamKey });
  }

  async cleanupStreamFiles(streamKey: string): Promise<void> {
    const outputDir = path.join(this.baseOutputPath, streamKey);
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
      logger.info('Stream files cleaned up', { streamKey });
    }
  }

  isStreamActive(streamKey: string): boolean {
    return this.streams.has(streamKey);
  }

  private cleanup(streamKey: string): void {
    this.streams.delete(streamKey);
  }
}
