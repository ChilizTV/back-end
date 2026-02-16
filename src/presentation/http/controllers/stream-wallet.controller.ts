import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetStreamerDonationsUseCase } from '../../../application/stream-wallet/use-cases/GetStreamerDonationsUseCase';
import { GetStreamerSubscriptionsUseCase } from '../../../application/stream-wallet/use-cases/GetStreamerSubscriptionsUseCase';
import { GetStreamerStatsUseCase } from '../../../application/stream-wallet/use-cases/GetStreamerStatsUseCase';
import { GetDonorHistoryUseCase } from '../../../application/stream-wallet/use-cases/GetDonorHistoryUseCase';
import { GetSubscriberHistoryUseCase } from '../../../application/stream-wallet/use-cases/GetSubscriberHistoryUseCase';

@injectable()
export class StreamWalletController {
  constructor(
    @inject(GetStreamerDonationsUseCase)
    private readonly getStreamerDonationsUseCase: GetStreamerDonationsUseCase,
    @inject(GetStreamerSubscriptionsUseCase)
    private readonly getStreamerSubscriptionsUseCase: GetStreamerSubscriptionsUseCase,
    @inject(GetStreamerStatsUseCase)
    private readonly getStreamerStatsUseCase: GetStreamerStatsUseCase,
    @inject(GetDonorHistoryUseCase)
    private readonly getDonorHistoryUseCase: GetDonorHistoryUseCase,
    @inject(GetSubscriberHistoryUseCase)
    private readonly getSubscriberHistoryUseCase: GetSubscriberHistoryUseCase
  ) {}

  async getStreamerDonations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { streamerAddress } = req.params;
      const donations = await this.getStreamerDonationsUseCase.execute(streamerAddress);

      res.json({
        success: true,
        donations: donations.map(d => d.toJSON()),
        count: donations.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStreamerSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { streamerAddress } = req.params;
      const subscriptions = await this.getStreamerSubscriptionsUseCase.execute(streamerAddress);

      res.json({
        success: true,
        subscriptions: subscriptions.map(s => s.toJSON()),
        count: subscriptions.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStreamerStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { streamerAddress } = req.params;
      const stats = await this.getStreamerStatsUseCase.execute(streamerAddress);

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDonorHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { donorAddress } = req.params;
      const donations = await this.getDonorHistoryUseCase.execute(donorAddress);

      res.json({
        success: true,
        donations: donations.map(d => d.toJSON()),
        count: donations.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubscriberHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { subscriberAddress } = req.params;
      const subscriptions = await this.getSubscriberHistoryUseCase.execute(subscriberAddress);

      res.json({
        success: true,
        subscriptions: subscriptions.map(s => s.toJSON()),
        count: subscriptions.length,
      });
    } catch (error) {
      next(error);
    }
  }
}
