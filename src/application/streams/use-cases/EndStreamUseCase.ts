import { injectable, inject } from 'tsyringe';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { NotFoundError } from '../../../domain/shared/errors/NotFoundError';

@injectable()
export class EndStreamUseCase {
  constructor(
    @inject('IStreamRepository')
    private readonly streamRepository: IStreamRepository
  ) {}

  async execute(params: { streamId?: string; streamKey?: string }): Promise<void> {
    const stream = params.streamId
      ? await this.streamRepository.findById(params.streamId)
      : params.streamKey
        ? await this.streamRepository.findByStreamKey(params.streamKey)
        : null;

    if (!stream) {
      throw new NotFoundError('Stream', params.streamId || params.streamKey || 'unknown');
    }

    stream.end();
    await this.streamRepository.update(stream);
  }
}
