import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetAllMatchesUseCase } from '../../../application/matches/use-cases/GetAllMatchesUseCase';
import { GetLiveMatchesUseCase } from '../../../application/matches/use-cases/GetLiveMatchesUseCase';
import { GetUpcomingMatchesUseCase } from '../../../application/matches/use-cases/GetUpcomingMatchesUseCase';
import { GetMatchByIdUseCase } from '../../../application/matches/use-cases/GetMatchByIdUseCase';
import { GetMatchesByLeagueUseCase } from '../../../application/matches/use-cases/GetMatchesByLeagueUseCase';
import { GetMatchStatsUseCase } from '../../../application/matches/use-cases/GetMatchStatsUseCase';

@injectable()
export class MatchController {
  constructor(
    @inject(GetAllMatchesUseCase)
    private readonly getAllMatchesUseCase: GetAllMatchesUseCase,
    @inject(GetLiveMatchesUseCase)
    private readonly getLiveMatchesUseCase: GetLiveMatchesUseCase,
    @inject(GetUpcomingMatchesUseCase)
    private readonly getUpcomingMatchesUseCase: GetUpcomingMatchesUseCase,
    @inject(GetMatchByIdUseCase)
    private readonly getMatchByIdUseCase: GetMatchByIdUseCase,
    @inject(GetMatchesByLeagueUseCase)
    private readonly getMatchesByLeagueUseCase: GetMatchesByLeagueUseCase,
    @inject(GetMatchStatsUseCase)
    private readonly getMatchStatsUseCase: GetMatchStatsUseCase
  ) {}

  async getAllMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matches = await this.getAllMatchesUseCase.execute();

      res.json({
        success: true,
        matches: matches.map(m => m.toJSON()),
        count: matches.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getLiveMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matches = await this.getLiveMatchesUseCase.execute();

      res.json({
        success: true,
        matches: matches.map(m => m.toJSON()),
        count: matches.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getUpcomingMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matches = await this.getUpcomingMatchesUseCase.execute();

      res.json({
        success: true,
        matches: matches.map(m => m.toJSON()),
        count: matches.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getMatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const match = await this.getMatchByIdUseCase.execute(id);

      res.json({
        success: true,
        match: match.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getMatchesByLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leagueId = parseInt(req.params.league);
      const matches = await this.getMatchesByLeagueUseCase.execute(leagueId);

      res.json({
        success: true,
        matches: matches.map(m => m.toJSON()),
        count: matches.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMatchStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.getMatchStatsUseCase.execute();

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
