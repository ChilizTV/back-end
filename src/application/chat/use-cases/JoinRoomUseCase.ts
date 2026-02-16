import { injectable, inject } from 'tsyringe';
import { ConnectedUser } from '../../../domain/chat/entities/ConnectedUser';
import { IChatRepository } from '../../../domain/chat/repositories/IChatRepository';

@injectable()
export class JoinRoomUseCase {
  constructor(
    @inject('IChatRepository')
    private readonly chatRepository: IChatRepository
  ) {}

  async execute(matchId: number, userId: string, username: string): Promise<ConnectedUser> {
    const user = ConnectedUser.create({
      matchId,
      userId,
      username,
    });

    return await this.chatRepository.addConnectedUser(user);
  }
}
