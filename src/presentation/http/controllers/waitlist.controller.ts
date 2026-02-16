import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { JoinWaitlistUseCase } from '../../../application/waitlist/use-cases/JoinWaitlistUseCase';
import { CheckAccessUseCase } from '../../../application/waitlist/use-cases/CheckAccessUseCase';
import { GetWaitlistStatsUseCase } from '../../../application/waitlist/use-cases/GetWaitlistStatsUseCase';

@injectable()
export class WaitlistController {
  constructor(
    @inject(JoinWaitlistUseCase)
    private readonly joinWaitlistUseCase: JoinWaitlistUseCase,
    @inject(CheckAccessUseCase)
    private readonly checkAccessUseCase: CheckAccessUseCase,
    @inject(GetWaitlistStatsUseCase)
    private readonly getWaitlistStatsUseCase: GetWaitlistStatsUseCase
  ) {}

  async joinWaitlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, walletAddress, source } = req.body;
      const normalizedEmail = email.trim().toLowerCase();

      const entry = await this.joinWaitlistUseCase.execute({
        email: normalizedEmail,
        walletAddress,
        source,
      });

      res.status(201).json({
        success: true,
        entry: entry.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async checkAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const email = req.query.email as string | undefined;
      const walletAddress = req.query.walletAddress as string | undefined;

      const result = await this.checkAccessUseCase.execute(email, walletAddress);

      res.json({
        success: true,
        hasAccess: result.hasAccess,
        ...(result.entry && {
          email: result.entry.getEmail(),
          walletAddress: result.entry.getWalletAddress(),
        }),
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.getWaitlistStatsUseCase.execute();

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
