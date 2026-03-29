import { injectable, inject } from 'tsyringe';
import { Match } from '../../../domain/matches/entities';
import { IMatchRepository } from '../../../domain/matches/repositories';

@injectable()
export class GetUpcomingMatchesUseCase {
  constructor(
    @inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository
  ) {}

  async execute(): Promise<Match[]> {
    return await this.matchRepository.findUpcoming();
  }
}
