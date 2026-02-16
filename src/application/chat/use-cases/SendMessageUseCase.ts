import { injectable, inject } from 'tsyringe';
import { ChatMessage, MessageType } from '../../../domain/chat/entities/ChatMessage';
import { IChatRepository } from '../../../domain/chat/repositories/IChatRepository';
import { SendMessageDto } from '../dto/SendMessageDto';

@injectable()
export class SendMessageUseCase {
  constructor(
    @inject('IChatRepository')
    private readonly chatRepository: IChatRepository
  ) {}

  async execute(dto: SendMessageDto): Promise<ChatMessage> {
    const message = ChatMessage.create({
      matchId: dto.matchId,
      userId: dto.userId,
      walletAddress: dto.walletAddress,
      username: dto.username,
      message: dto.message,
      type: MessageType.REGULAR,
      isFeatured: dto.isFeatured || false,
    });

    await this.chatRepository.updateUserActivity(dto.matchId, dto.userId);

    return await this.chatRepository.saveMessage(message);
  }
}
