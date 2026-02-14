import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { MatchController } from './controllers/match.controller';
import { ChatController } from './controllers/chat.controller';
import { StreamController } from './controllers/stream.controller';
import { WaitlistController } from './controllers/waitlist.controller';
import { predictionController } from './controllers/prediction.controller';
import { StreamWalletController } from './controllers/stream-wallet.controller';
import { streamService } from './services/stream.service';
import { streamWalletService } from './services/stream-wallet.service';
import { bettingEventIndexerService } from './services/betting-event-indexer.service';
import { startMatchSyncCron } from './cron/sync-matches.cron';
import { startStreamCleanupCron } from './cron/cleanup-streams.cron';
import { MatchService } from './services/match.service';
import { startPredictionSettlementCron } from './cron/settle-predictions.cron';
import { startResolveMarketsCron } from './cron/resolve-markets.cron';
import { config } from 'dotenv';
import * as path from 'path';
import './config/supabase'; // Initialize Supabase

config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT;

// Initialize Socket.IO
const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

// Serve static files for HLS streams
const streamsStaticPath = path.join(process.cwd(), 'public', 'streams');
console.log(`📁 Serving static streams from: ${streamsStaticPath}`);

app.use('/streams', express.static(streamsStaticPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.m3u8')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            // Cache-Control: no-cache to force playlist reload (normal for HLS live)
            res.setHeader('Cache-Control', 'no-cache');
            // Access-Control-Allow-Origin for cross-origin requests
            res.setHeader('Access-Control-Allow-Origin', '*');
        } else if (filePath.endsWith('.ts')) {
            res.setHeader('Content-Type', 'video/mp2t');
            // Segments can be cached longer
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
    }
}));

const matchController = new MatchController();
const chatController = new ChatController();
const streamController = new StreamController();
const waitlistController = new WaitlistController();
const streamWalletController = new StreamWalletController();

app.use('/matches', matchController.getRouter());
app.use('/chat', chatController.getRouter());
app.use('/stream', streamController.getRouter());
app.use('/waitlist', waitlistController.getRouter());
app.use('/stream-wallet', streamWalletController.router);

app.use('/predictions', predictionController.getRouter());

app.get('/supabase-status', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Supabase Chat service is running',
        realtime: true,
        port: PORT
    });
});

// Socket.IO namespace for streaming
const streamNamespace = io.of('/stream');

streamNamespace.on('connection', (socket) => {
    console.log(`📡 Client connected to /stream namespace: ${socket.id}`);

    socket.on('stream:start', async (data: { streamKey: string }) => {
        console.log(`🎬 Stream start requested for streamKey: ${data.streamKey}`);
        console.log(`📋 Full data received:`, JSON.stringify(data));
        if (!data || !data.streamKey) {
            console.error('❌ stream:start received without streamKey');
            console.error('❌ Data received:', data);
            return;
        }
        console.log(`📋 About to call streamService.startStreaming(${data.streamKey})`);
        try {
            await streamService.startStreaming(data.streamKey, socket);
            console.log(`✅ streamService.startStreaming called successfully`);
        } catch (error) {
            console.error(`❌ Error in streamService.startStreaming:`, error);
        }
    });

    socket.on('stream:data', (data: { streamKey: string; chunk: Buffer | Uint8Array | ArrayBuffer }) => {
        if (!data.streamKey) {
            console.error('❌ stream:data received without streamKey');
            return;
        }
        
        let buffer: Buffer;
        if (Buffer.isBuffer(data.chunk)) {
            buffer = data.chunk;
        } else if (data.chunk instanceof Uint8Array) {
            buffer = Buffer.from(data.chunk);
        } else if (data.chunk instanceof ArrayBuffer) {
            buffer = Buffer.from(new Uint8Array(data.chunk));
        } else {
            console.error('❌ Invalid chunk type received');
            return;
        }
        
        streamService.handleStreamData(data.streamKey, buffer);
    });

    socket.on('stream:audio', (data: { streamKey: string; audioData: number[] }) => {
        if (!data.streamKey || !data.audioData) {
            return; // Skip silently if invalid
        }
        
        streamService.handleStreamAudio(data.streamKey, data.audioData);
    });

    socket.on('stream:end', (data: { streamKey: string }) => {
        console.log(`🛑 Stream end requested: ${data.streamKey}`);
        // The stream will be ended via the REST API
    });

    socket.on('disconnect', () => {
        console.log(`📡 Client disconnected from /stream namespace: ${socket.id}`);
    });
});

app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Football Chat API with Supabase Realtime',
        version: '2.0.0',
        endpoints: {
            matches: '/matches',
            chat: '/chat',
            stream: '/stream',
            supabaseStatus: '/supabase-status'
        }
    });
});

const matchService = new MatchService();

server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`🔗 Supabase Realtime service connected`);
    console.log(`📡 Chat endpoints available at /chat`);
    console.log(`⚽ Match endpoints available at /matches`);
    console.log(`📺 Stream endpoints available at /stream`);
    console.log(`💰 Stream Wallet endpoints available at /stream-wallet`);
    console.log(`🎯 Predictions endpoints available at /predictions`);
    console.log(`🎬 Socket.IO streaming namespace available at /stream`);
    console.log(`🌐 API available at http://localhost:${PORT}`);

    // Clean up matches outside 24h window on startup
    matchService.cleanupOldMatches().catch(err => {
        console.error('❌ Startup cleanup (matches outside 24h):', err);
    });

    startMatchSyncCron();
    startStreamCleanupCron();
    startPredictionSettlementCron();
    startResolveMarketsCron();

    // Start blockchain event indexing for donations and subscriptions
    console.log('🔍 Starting blockchain event indexing...');
    streamWalletService.startEventIndexing().catch(error => {
        console.error('❌ Failed to start event indexing:', error);
    });

    // Start betting event indexing (BetPlaced → predictions + chat)
    console.log('🎯 Starting betting event indexing...');
    bettingEventIndexerService.startEventIndexing().catch(error => {
        console.error('❌ Failed to start betting event indexing:', error);
    });
});