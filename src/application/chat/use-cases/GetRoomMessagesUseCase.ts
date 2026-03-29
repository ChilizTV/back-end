import { injectable, inject } from 'tsyringe';
import { ChatMessage } from '../../../domain/chat/entities';
import { IChatRepository } from '../../../domain/chat/repositories';

@injectable()
export class GetRoomMessagesUseCase {
  constructor(
    @inject('IChatRepository')
    private readonly chatRepository: IChatRepository
  ) {}

  async execute(matchId: number, limit: number = 50, offset: number = 0, streamId?: string): Promise<ChatMessage[]> {
    return await this.chatRepository.findMessagesByMatchId(matchId, limit, offset, streamId);
  }
}
