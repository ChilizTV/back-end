import { injectable, inject } from 'tsyringe';
import { Match } from '../../../domain/matches/entities/Match';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';
import { MatchFetchWindow } from '../../../domain/matches/value-objects/MatchFetchWindow';

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
