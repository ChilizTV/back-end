import { injectable, inject } from 'tsyringe';
import { Match } from '../../../domain/matches/entities';
import { IMatchRepository } from '../../../domain/matches/repositories';

@injectable()
export class GetMatchesByLeagueUseCase {
  constructor(
    @inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository
  ) {}

  async execute(leagueId: number): Promise<Match[]> {
    return await this.matchRepository.findByLeagueId(leagueId);
  }
}
