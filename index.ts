import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import http from 'http';
import Gun from 'gun';
import { MatchController } from './controllers';
import { ChatController } from './controllers/chat.controller';
import { startMatchSyncCron } from './cron/sync-matches.cron';
import { config } from 'dotenv';
config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const gun = Gun({
    web: server,
    multicast: false
});

app.use(bodyParser.json());
app.use(cors());

app.use('/gun', (req, res, next) => {
    next();
});

const matchController = new MatchController();
const chatController = new ChatController();

app.use('/matches', matchController.buildRoutes());
app.use('/chat', chatController.getRouter());

app.get('/gun-status', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Gun.js server is running',
        websocket: true,
        port: PORT
    });
});

app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Football Chat API',
        version: '1.0.0',
        endpoints: {
            matches: '/matches',
            chat: '/chat',
            gunStatus: '/gun-status'
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`🔗 Gun.js WebSocket server running on port ${PORT}`);
    console.log(`📡 Chat endpoints available at /chat`);
    console.log(`⚽ Match endpoints available at /matches`);
    console.log(`🌐 API available at http://localhost:${PORT}`);
    
    startMatchSyncCron();
});