import { injectable, inject } from 'tsyringe';
import { ConnectedUser } from '../../../domain/chat/entities/ConnectedUser';
import { IChatRepository } from '../../../domain/chat/repositories/IChatRepository';

@injectable()
export class GetConnectedUsersUseCase {
  constructor(
    @inject('IChatRepository')
    private readonly chatRepository: IChatRepository
  ) {}

  async execute(matchId: number): Promise<ConnectedUser[]> {
    return await this.chatRepository.findConnectedUsersByMatchId(matchId);
  }
}
