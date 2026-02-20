import { injectable, inject } from 'tsyringe';
import { ChatMessage, MessageType } from '../../../domain/chat/entities/ChatMessage';
import { IChatRepository } from '../../../domain/chat/repositories/IChatRepository';
import { SubscriptionChecker } from '../../../domain/chat/services/SubscriptionChecker';
import { SendMessageDto } from '../dto/SendMessageDto';

@injectable()
export class SendMessageUseCase {
  constructor(
    @inject('IChatRepository')
    private readonly chatRepository: IChatRepository,
    @inject(SubscriptionChecker)
    private readonly subscriptionChecker: SubscriptionChecker
  ) {}

  async execute(dto: SendMessageDto): Promise<ChatMessage> {
    // Check if user has an active subscription to determine featured status
    const isFeatured = await this.subscriptionChecker.hasActiveSubscription(dto.walletAddress);

    const message = ChatMessage.create({
      matchId: dto.matchId,
      userId: dto.userId,
      walletAddress: dto.walletAddress,
      username: dto.username,
      message: dto.message,
      type: MessageType.REGULAR,
      isFeatured,
    });

    await this.chatRepository.updateUserActivity(dto.matchId, dto.userId);

    return await this.chatRepository.saveMessage(message);
  }
}
