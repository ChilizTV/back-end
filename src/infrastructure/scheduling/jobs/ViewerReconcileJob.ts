import { injectable } from 'tsyringe';
import { container } from '../../config/di-container';
import { ViewerSessionService } from '../../services/ViewerSessionService';
import { logger } from '../../logging/logger';

@injectable()
export class ViewerReconcileJob {
  private readonly schedule = '* * * * *'; // Every 60s

  getSchedule(): string {
    return this.schedule;
  }

  async execute(): Promise<void> {
    try {
      const viewerSessionService = container.resolve(ViewerSessionService);
      await viewerSessionService.reconcileAllLiveStreams();
    } catch (error) {
      logger.error('ViewerReconcileJob failed', { error: (error as Error).message });
    }
  }
}
