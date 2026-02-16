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

  async execute(id: number): Promise<Match> {
    const match = await this.matchRepository.findById(id);

    if (!match) {
      throw new NotFoundError('Match', id);
    }

    return match;
  }
}
