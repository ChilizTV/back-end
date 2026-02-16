import { injectable, inject } from 'tsyringe';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { NotFoundError } from '../../../domain/shared/errors/NotFoundError';

@injectable()
export class UpdateViewerCountUseCase {
  constructor(
    @inject('IStreamRepository')
    private readonly streamRepository: IStreamRepository
  ) {}

  async execute(streamId: string, count: number): Promise<void> {
    const stream = await this.streamRepository.findById(streamId);

    if (!stream) {
      throw new NotFoundError('Stream', streamId);
    }

    stream.updateViewerCount(count);
    await this.streamRepository.update(stream);
  }
}
