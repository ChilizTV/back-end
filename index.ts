import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
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
import './config/supabase';
import { securityHeadersMiddleware } from './src/infrastructure/config/security.config';
import { env } from './src/infrastructure/config/environment';
import { errorHandler } from './src/presentation/http/middlewares/error-handler.middleware';
import { requestLogger } from './src/infrastructure/logging/middlewares/request-logger.middleware';
import { logger } from './src/infrastructure/logging/logger';
import { authRoutes } from './src/presentation/http/routes/auth.routes';
import { predictionRoutes } from './src/presentation/http/routes/prediction.routes';
import { matchRoutes } from './src/presentation/http/routes/match.routes';
import { chatRoutes } from './src/presentation/http/routes/chat.routes';
import { waitlistRoutes } from './src/presentation/http/routes/waitlist.routes';
import { streamRoutes } from './src/presentation/http/routes/stream.routes';
import { streamWalletRoutes } from './src/presentation/http/routes/stream-wallet.routes';
import { authenticate } from './src/presentation/http/middlewares/authentication.middleware';
import {
  globalLimiter,
  authLimiter,
  predictionsLimiter,
  chatLimiter,
} from './src/presentation/http/middlewares/rate-limit.middleware';
import { setupDependencyInjection } from './src/infrastructure/config/di-container';

config();
setupDependencyInjection();

const app = express();
const server = http.createServer(app);
const PORT = env.PORT;

// Parse allowed origins from environment variable (comma-separated)
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

// Initialize Socket.IO with CORS whitelist
const io = new SocketIOServer(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Security headers (Helmet) - adapted for Web3/dev environment
app.use(securityHeadersMiddleware);

// Body parser
app.use(bodyParser.json({ limit: '50mb' }));

// CORS with whitelist (replaces permissive cors())
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global rate limiting
app.use(globalLimiter);

// Request logging with correlation IDs
app.use(requestLogger);

// Serve static files for HLS streams
const streamsStaticPath = path.join(process.cwd(), 'public', 'streams');
logger.info('Serving static streams', { path: streamsStaticPath });

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

// Public routes (no authentication required)
app.use('/auth', authLimiter, authRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        version: '2.0.0',
    });
});

// Global authentication middleware - all routes below require JWT
app.use(authenticate);

app.use('/matches', matchRoutes);
app.use('/chat', chatLimiter, chatRoutes);
app.use('/stream', streamRoutes);
app.use('/waitlist', waitlistRoutes);
app.use('/stream-wallet', streamWalletRoutes);

app.use('/predictions', predictionsLimiter, predictionRoutes);

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

// Global error handler - MUST be after all routes
app.use(errorHandler);

const matchService = new MatchService();

server.listen(PORT, () => {
    logger.info('Server started successfully', {
        port: PORT,
        environment: env.NODE_ENV,
        endpoints: {
            matches: '/matches',
            chat: '/chat',
            stream: '/stream',
            streamWallet: '/stream-wallet',
            predictions: '/predictions',
        },
    });

    // Clean up matches outside 24h window on startup
    matchService.cleanupOldMatches().catch(err => {
        logger.error('Startup cleanup failed', { error: err.message });
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