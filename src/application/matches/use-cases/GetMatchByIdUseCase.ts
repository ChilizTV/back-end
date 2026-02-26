import { injectable, inject } from 'tsyringe';
import { Match } from '../../../domain/matches/entities/Match';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';
import { NotFoundError } from '../../../domain/shared/errors/NotFoundError';

@injectable()
export class GetMatchByIdUseCase {
  constructor(
    @inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository
  ) {}

  async execute(apiFootballId: number): Promise<Match> {
    const match = await this.matchRepository.findByApiFootballId(apiFootballId);

    if (!match) {
      throw new NotFoundError('Match', apiFootballId);
    }

    return match;
  }
}
