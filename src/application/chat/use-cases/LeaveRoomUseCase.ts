import { injectable, inject } from 'tsyringe';
import { IChatRepository } from '../../../domain/chat/repositories/IChatRepository';

@injectable()
export class LeaveRoomUseCase {
  constructor(
    @inject('IChatRepository')
    private readonly chatRepository: IChatRepository
  ) {}

  async execute(matchId: number, userId: string): Promise<void> {
    await this.chatRepository.removeConnectedUser(matchId, userId);
  }
}
