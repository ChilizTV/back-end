import { injectable, inject } from 'tsyringe';
import { Stream } from '../../../domain/streams/entities/Stream';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { CreateStreamDto } from '../dto/CreateStreamDto';

@injectable()
export class CreateStreamUseCase {
  constructor(
    @inject('IStreamRepository')
    private readonly streamRepository: IStreamRepository
  ) {}

  async execute(dto: CreateStreamDto): Promise<Stream> {
    const streamKey = `live_${dto.streamerId}_${crypto.randomUUID().slice(0, 8)}`;

    const stream = Stream.create({
      matchId: dto.matchId,
      streamerId: dto.streamerId,
      streamerName: dto.streamerName,
      streamerWalletAddress: dto.streamerWalletAddress,
      streamKey,
      hlsUrl: `/streams/${streamKey}/playlist.m3u8`,
      title: dto.title,
      isLive: true,
      viewerCount: 0,
    });

    return await this.streamRepository.save(stream);
  }
}
