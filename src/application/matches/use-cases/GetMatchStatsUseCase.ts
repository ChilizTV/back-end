import { injectable, inject } from 'tsyringe';
import { IMatchRepository, MatchStats } from '../../../domain/matches/repositories/IMatchRepository';

@injectable()
export class GetMatchStatsUseCase {
  constructor(
    @inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository
  ) {}

  async execute(): Promise<MatchStats> {
    return await this.matchRepository.getStats();
  }
}
