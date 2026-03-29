import { injectable, inject } from 'tsyringe';
import { Match } from '../../../domain/matches/entities';
import { IMatchRepository } from '../../../domain/matches/repositories';
import { MatchFetchWindow } from '../../../domain/matches/value-objects';

@injectable()
export class GetAllMatchesUseCase {
  constructor(
    @inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository
  ) {}

  async execute(): Promise<Match[]> {
    const now = new Date();
    return await this.matchRepository.findByDateRange(
      MatchFetchWindow.fetchFrom(now),
      MatchFetchWindow.fetchTo(now),
    );
  }
}
