import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import http from 'http';
import { MatchController } from './controllers/match.controller';
import { ChatController } from './controllers/chat.controller';
import { startMatchSyncCron } from './cron/sync-matches.cron';
import { config } from 'dotenv';
import './config/supabase'; // Initialize Supabase

config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());

const matchController = new MatchController();
const chatController = new ChatController();

app.use('/matches', matchController.getRouter());
app.use('/chat', chatController.getRouter());

app.get('/supabase-status', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Supabase Chat service is running',
        realtime: true,
        port: PORT
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
            supabaseStatus: '/supabase-status'
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`🔗 Supabase Realtime service connected`);
    console.log(`📡 Chat endpoints available at /chat`);
    console.log(`⚽ Match endpoints available at /matches`);
    console.log(`🌐 API available at http://localhost:${PORT}`);
    
    startMatchSyncCron();
});