import { injectable, inject } from 'tsyringe';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { NotFoundError } from '../../../domain/shared/errors/NotFoundError';

@injectable()
export class EndStreamUseCase {
  constructor(
    @inject('IStreamRepository')
    private readonly streamRepository: IStreamRepository
  ) {}

  async execute(streamKey: string): Promise<void> {
    const stream = await this.streamRepository.findByStreamKey(streamKey);

    if (!stream) {
      throw new NotFoundError('Stream', streamKey);
    }

    stream.end();
    await this.streamRepository.update(stream);
  }
}
