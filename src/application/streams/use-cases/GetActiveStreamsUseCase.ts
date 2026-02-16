import { injectable, inject } from 'tsyringe';
import { Stream } from '../../../domain/streams/entities/Stream';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';

@injectable()
export class GetActiveStreamsUseCase {
  constructor(
    @inject('IStreamRepository')
    private readonly streamRepository: IStreamRepository
  ) {}

  async execute(): Promise<Stream[]> {
    return await this.streamRepository.findActiveStreams();
  }
}
