import { injectable, inject } from 'tsyringe';
import { Match } from '../../../domain/matches/entities/Match';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';

@injectable()
export class GetLiveMatchesUseCase {
  constructor(
    @inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository
  ) {}

  async execute(): Promise<Match[]> {
    return await this.matchRepository.findLive();
  }
}
