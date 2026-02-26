import { injectable, inject } from 'tsyringe';
import { IChatRepository, ChatStats } from '../../../domain/chat/repositories/IChatRepository';

@injectable()
export class GetChatStatsUseCase {
  constructor(
    @inject('IChatRepository')
    private readonly chatRepository: IChatRepository
  ) {}

  async execute(): Promise<ChatStats> {
    return await this.chatRepository.getChatStats();
  }
}
