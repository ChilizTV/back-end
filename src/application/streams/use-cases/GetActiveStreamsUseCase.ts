import { injectable, inject } from 'tsyringe';
import { Stream } from '../../../domain/streams/entities/Stream';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';

@injectable()
export class GetActiveStreamsUseCase {
  constructor(
    @inject('IStreamRepository')
    private readonly streamRepository: IStreamRepository
  ) {}

  async execute(matchId?: number): Promise<Stream[]> {
    if (matchId) {
      return this.streamRepository.findActiveByMatchIds([matchId]);
    }
    return this.streamRepository.findActiveStreams();
  }
}
