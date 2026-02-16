import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { JoinRoomUseCase } from '../../../application/chat/use-cases/JoinRoomUseCase';
import { LeaveRoomUseCase } from '../../../application/chat/use-cases/LeaveRoomUseCase';
import { SendMessageUseCase } from '../../../application/chat/use-cases/SendMessageUseCase';
import { SendBetMessageUseCase } from '../../../application/chat/use-cases/SendBetMessageUseCase';
import { GetRoomMessagesUseCase } from '../../../application/chat/use-cases/GetRoomMessagesUseCase';
import { GetConnectedUsersUseCase } from '../../../application/chat/use-cases/GetConnectedUsersUseCase';
import { GetChatStatsUseCase } from '../../../application/chat/use-cases/GetChatStatsUseCase';

@injectable()
export class ChatController {
  constructor(
    @inject(JoinRoomUseCase)
    private readonly joinRoomUseCase: JoinRoomUseCase,
    @inject(LeaveRoomUseCase)
    private readonly leaveRoomUseCase: LeaveRoomUseCase,
    @inject(SendMessageUseCase)
    private readonly sendMessageUseCase: SendMessageUseCase,
    @inject(SendBetMessageUseCase)
    private readonly sendBetMessageUseCase: SendBetMessageUseCase,
    @inject(GetRoomMessagesUseCase)
    private readonly getRoomMessagesUseCase: GetRoomMessagesUseCase,
    @inject(GetConnectedUsersUseCase)
    private readonly getConnectedUsersUseCase: GetConnectedUsersUseCase,
    @inject(GetChatStatsUseCase)
    private readonly getChatStatsUseCase: GetChatStatsUseCase
  ) {}

  async joinRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      const { userId, username } = req.body;

      const user = await this.joinRoomUseCase.execute(matchId, userId, username);

      res.json({
        success: true,
        message: `${username} joined match ${matchId}`,
        matchId,
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async leaveRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      const { userId, username } = req.body;

      await this.leaveRoomUseCase.execute(matchId, userId);

      res.json({
        success: true,
        message: `${username} left match ${matchId}`,
        matchId,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      const { userId, walletAddress, username, message, isFeatured } = req.body;

      const chatMessage = await this.sendMessageUseCase.execute({
        matchId,
        userId,
        walletAddress,
        username,
        message,
        isFeatured,
      });

      res.json({
        success: true,
        message: chatMessage.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async sendBetMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      const { userId, walletAddress, username, message, betType, betSubType, amount, odds, isFeatured } = req.body;

      const chatMessage = await this.sendBetMessageUseCase.execute({
        matchId,
        userId,
        walletAddress,
        username,
        message,
        betType,
        betSubType,
        amount,
        odds,
        isFeatured,
      });

      res.json({
        success: true,
        message: chatMessage.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getRoomMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      const { limit = 50, offset = 0 } = req.query;

      const messages = await this.getRoomMessagesUseCase.execute(matchId, Number(limit), Number(offset));

      res.json({
        success: true,
        messages: messages.map(m => m.toJSON()),
        count: messages.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getConnectedUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);

      const users = await this.getConnectedUsersUseCase.execute(matchId);

      res.json({
        success: true,
        users: users.map(u => u.toJSON()),
        count: users.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChatStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.getChatStatsUseCase.execute();

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
