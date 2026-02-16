import { injectable, inject } from 'tsyringe';
import { ChatMessage, MessageType } from '../../../domain/chat/entities/ChatMessage';
import { IChatRepository } from '../../../domain/chat/repositories/IChatRepository';
import { SendBetMessageDto } from '../dto/SendMessageDto';

@injectable()
export class SendBetMessageUseCase {
  constructor(
    @inject('IChatRepository')
    private readonly chatRepository: IChatRepository
  ) {}

  async execute(dto: SendBetMessageDto): Promise<ChatMessage> {
    const message = ChatMessage.create({
      matchId: dto.matchId,
      userId: dto.userId,
      walletAddress: dto.walletAddress,
      username: dto.username,
      message: dto.message,
      type: MessageType.BET,
      isFeatured: dto.isFeatured || false,
      betType: dto.betType,
      betSubType: dto.betSubType,
      amount: dto.amount,
      odds: dto.odds,
    });

    await this.chatRepository.updateUserActivity(dto.matchId, dto.userId);

    return await this.chatRepository.saveMessage(message);
  }
}
