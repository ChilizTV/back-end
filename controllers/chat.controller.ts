import { Request, Response, Router } from 'express';
import { ChatService } from '../services/chat.service';
import { TokenBalanceService } from '../services/token-balance.service';
import { ServiceErrorCode } from '../services/service.result';

export class ChatController {
    private router: Router;
    private chatService: ChatService;
    private tokenBalanceService: TokenBalanceService;

    constructor() {
        this.router = Router();
        this.chatService = new ChatService();
        this.tokenBalanceService = new TokenBalanceService();
        this.buildRoutes();
    }

    private buildRoutes(): void {
        this.router.post('/join/:matchId', this.joinRoom.bind(this));
        
        this.router.post('/leave/:matchId', this.leaveRoom.bind(this));
        
        this.router.post('/message/:matchId', this.sendMessage.bind(this));
        
        this.router.post('/bet/:matchId', this.sendBetMessage.bind(this));
        
        this.router.get('/messages/:matchId', this.getRoomMessages.bind(this));
        
        this.router.get('/users/:matchId', this.getConnectedUsers.bind(this));
        
        this.router.get('/stats', this.getChatStats.bind(this));
        
        this.router.get('/token-balances/:walletAddress', this.getUserTokenBalances.bind(this));
        
        // WebSocket
        this.router.get('/gun', this.serveGun.bind(this));
    }

    private async joinRoom(req: Request, res: Response): Promise<void> {
        try {
            const { matchId } = req.params;
            const { userId, username } = req.body;

            if (!userId || !username) {
                res.status(400).json({ error: 'userId and username are required' });
                return;
            }

            const result = await this.chatService.joinRoom(parseInt(matchId), userId, username);
            
            if (result.errorCode === ServiceErrorCode.success) {
                res.json({ 
                    success: true, 
                    message: `${username} joined match ${matchId}`,
                    matchId: parseInt(matchId)
                });
            } else {
                res.status(500).json({ error: 'Failed to join room' });
            }
        } catch (error) {
            console.error('❌ Error in joinRoom:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async leaveRoom(req: Request, res: Response): Promise<void> {
        try {
            const { matchId } = req.params;
            const { userId, username } = req.body;

            if (!userId || !username) {
                res.status(400).json({ error: 'userId and username are required' });
                return;
            }

            const result = await this.chatService.leaveRoom(parseInt(matchId), userId, username);
            
            if (result.errorCode === ServiceErrorCode.success) {
                res.json({ 
                    success: true, 
                    message: `${username} left match ${matchId}`,
                    matchId: parseInt(matchId)
                });
            } else {
                res.status(500).json({ error: 'Failed to leave room' });
            }
        } catch (error) {
            console.error('❌ Error in leaveRoom:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async sendMessage(req: Request, res: Response): Promise<void> {
        try {
            const { matchId } = req.params;
            const { userId, username, message, walletAddress } = req.body;

            if (!userId || !username || !message || !walletAddress) {
                res.status(400).json({ error: 'userId, username, message and walletAddress are required' });
                return;
            }

            const result = await this.chatService.sendMessage(parseInt(matchId), userId, username, message, walletAddress);
            
            if (result.errorCode === ServiceErrorCode.success) {
                res.json({ 
                    success: true, 
                    message: 'Message sent successfully',
                    data: result.result
                });
            } else {
                res.status(500).json({ error: 'Failed to send message' });
            }
        } catch (error) {
            console.error('❌ Error in sendMessage:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async sendBetMessage(req: Request, res: Response): Promise<void> {
        try {
            const { matchId } = req.params;
            const { userId, username, betType, betSubType, amount, odds, walletAddress } = req.body;

            if (!userId || !username || !betType || !betSubType || !amount || !odds || !walletAddress) {
                res.status(400).json({ error: 'userId, username, betType, betSubType, amount, odds and walletAddress are required' });
                return;
            }

            const validBetTypes = [
                'match_winner', 'over_under', 'both_teams_score', 'double_chance', 
                'draw_no_bet', 'first_half_winner', 'first_half_goals', 'ht_ft', 
                'correct_score', 'exact_goals_number', 'goalscorers', 'clean_sheet', 
                'win_to_nil', 'highest_scoring_half', 'odd_even_goals', 'first_half_odd_even'
            ];

            if (!validBetTypes.includes(betType)) {
                res.status(400).json({ error: 'betType must be one of the valid types' });
                return;
            }

            const result = await this.chatService.sendBetMessage(
                parseInt(matchId), 
                userId, 
                username, 
                betType, 
                betSubType, 
                parseFloat(amount), 
                parseFloat(odds),
                walletAddress
            );
            
            if (result.errorCode === ServiceErrorCode.success) {
                res.json({ 
                    success: true, 
                    message: 'Bet message sent successfully',
                    data: result.result
                });
            } else {
                res.status(500).json({ error: 'Failed to send bet message' });
            }
        } catch (error) {
            console.error('❌ Error in sendBetMessage:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async getRoomMessages(req: Request, res: Response): Promise<void> {
        try {
            const { matchId } = req.params;
            const result = await this.chatService.getRoomMessages(parseInt(matchId));
            
            if (result.errorCode === ServiceErrorCode.success) {
                res.json({ 
                    success: true, 
                    messages: result.result,
                    matchId: parseInt(matchId)
                });
            } else {
                res.status(500).json({ error: 'Failed to get room messages' });
            }
        } catch (error) {
            console.error('❌ Error in getRoomMessages:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async getConnectedUsers(req: Request, res: Response): Promise<void> {
        try {
            const { matchId } = req.params;
            const result = await this.chatService.getConnectedUsers(parseInt(matchId));
            
            if (result.errorCode === ServiceErrorCode.success) {
                res.json({ 
                    success: true, 
                    users: result.result,
                    matchId: parseInt(matchId)
                });
            } else {
                res.status(500).json({ error: 'Failed to get connected users' });
            }
        } catch (error) {
            console.error('❌ Error in getConnectedUsers:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async getChatStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = this.chatService.getStats();
            res.json({ 
                success: true, 
                stats 
            });
        } catch (error) {
            console.error('❌ Error in getChatStats:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async getUserTokenBalances(req: Request, res: Response): Promise<void> {
        try {
            const { walletAddress } = req.params;
            const result = await this.tokenBalanceService.getUserTokenBalances(walletAddress);
            
            if (result.errorCode === ServiceErrorCode.success && result.result) {
                res.json({
                    success: true,
                    balances: result.result
                });
            } else {
                res.status(500).json({ error: 'Failed to get token balances' });
            }
        } catch (error) {
            console.error('❌ Error in getUserTokenBalances:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async serveGun(req: Request, res: Response): Promise<void> {
        try {
            const gun = this.chatService.getGunInstance();
            res.json({ 
                success: true, 
                message: 'Gun.js server running',
                websocket: true
            });
        } catch (error) {
            console.error('❌ Error in serveGun:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    public getRouter(): Router {
        return this.router;
    }
} 