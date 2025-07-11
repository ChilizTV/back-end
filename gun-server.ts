import Gun from 'gun';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 8765;

app.use(cors({
    origin: '*',
    credentials: true
}));

const server = app.listen(PORT, () => {
    console.log(`GUN server running on port ${PORT}`);
});

const gun = Gun({
    web: server,
    localStorage: false
});

app.get('/health', (req, res) => {
    res.json({ status: 'GUN server is running' });
});

console.log('GUN server initialized'); 