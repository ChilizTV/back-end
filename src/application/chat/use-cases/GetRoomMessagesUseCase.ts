import { injectable, inject } from 'tsyringe';
import { ChatMessage } from '../../../domain/chat/entities/ChatMessage';
import { IChatRepository } from '../../../domain/chat/repositories/IChatRepository';

@injectable()
export class GetRoomMessagesUseCase {
  constructor(
    @inject('IChatRepository')
    private readonly chatRepository: IChatRepository
  ) {}

  async execute(matchId: number, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    return await this.chatRepository.findMessagesByMatchId(matchId, limit, offset);
  }
}
