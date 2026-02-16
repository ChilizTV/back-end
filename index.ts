import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from 'dotenv';
import * as path from 'path';
import './config/supabase';
import { securityHeadersMiddleware, env, setupDependencyInjection, container } from './src/infrastructure/config';
import { logger, requestLogger } from './src/infrastructure/logging';
import { errorHandler, authenticate, globalLimiter, authLimiter, predictionsLimiter, chatLimiter } from './src/presentation/http/middlewares';
import { SocketServer } from './src/presentation/websocket';
import { JobScheduler, BlockchainEventListener } from './src/infrastructure/services';
import { CleanupOldMatchesUseCase } from './src/application/matches/use-cases/CleanupOldMatchesUseCase';
config();
setupDependencyInjection();
import { authRoutes, predictionRoutes, matchRoutes, chatRoutes, waitlistRoutes, streamRoutes, streamWalletRoutes } from './src/presentation/http/routes';

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

// Initialize Socket.IO server
const socketServer = container.resolve(SocketServer);
socketServer.initialize(io);

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
    const cleanupUseCase = container.resolve(CleanupOldMatchesUseCase);
    cleanupUseCase.cleanupOutside24Hours().catch((err: Error) => {
        logger.error('Startup cleanup failed', { error: err.message });
    });

    // Start all scheduled jobs
    const jobScheduler = container.resolve(JobScheduler);
    jobScheduler.start();

    // Start blockchain event listeners
    const blockchainEventListener = container.resolve(BlockchainEventListener);
    blockchainEventListener.start().catch((error: Error) => {
        logger.error('Failed to start blockchain event listeners', { error: error.message });
    });
});