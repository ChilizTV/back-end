import { injectable } from 'tsyringe';
import cron from 'node-cron';
import { SyncMatchesJob } from './jobs/SyncMatchesJob';
import { ResolveMarketsJob } from './jobs/ResolveMarketsJob';
import { CleanupStreamsJob } from './jobs/CleanupStreamsJob';
import { SettlePredictionsJob } from './jobs/SettlePredictionsJob';
import { logger } from '../logging/logger';

/**
 * Job Scheduler
 * Manages all scheduled jobs in the application
 */
@injectable()
export class JobScheduler {
    private cronTasks: cron.ScheduledTask[] = [];
    private intervals: NodeJS.Timeout[] = [];

    constructor(
        private readonly syncMatchesJob: SyncMatchesJob,
        private readonly resolveMarketsJob: ResolveMarketsJob,
        private readonly cleanupStreamsJob: CleanupStreamsJob,
        private readonly settlePredictionsJob: SettlePredictionsJob
    ) {}

    /**
     * Start all scheduled jobs
     */
    start(): void {
        logger.info('Starting job scheduler');

        // Cron-based jobs (with cron expressions)
        this.startCronJob(
            'SyncMatches',
            this.syncMatchesJob.getSchedule(),
            () => this.syncMatchesJob.execute()
        );

        this.startCronJob(
            'CleanupStreams',
            this.cleanupStreamsJob.getSchedule(),
            () => this.cleanupStreamsJob.execute()
        );

        // Interval-based jobs
        this.startIntervalJob(
            'ResolveMarkets',
            this.resolveMarketsJob.getIntervalMs(),
            () => this.resolveMarketsJob.execute()
        );

        this.startIntervalJob(
            'SettlePredictions',
            this.settlePredictionsJob.getIntervalMs(),
            () => this.settlePredictionsJob.execute()
        );

        logger.info('Job scheduler started successfully');
    }

    /**
     * Stop all scheduled jobs
     */
    stop(): void {
        logger.info('Stopping job scheduler');

        // Stop all cron tasks
        this.cronTasks.forEach(task => task.stop());
        this.cronTasks = [];

        // Stop all interval tasks
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];

        logger.info('Job scheduler stopped');
    }

    /**
     * Start a cron-based job
     */
    private startCronJob(name: string, schedule: string, handler: () => Promise<void>): void {
        logger.info(`Starting cron job: ${name}`, { schedule });

        const task = cron.schedule(schedule, async () => {
            try {
                await handler();
            } catch (error) {
                logger.error(`Cron job ${name} failed`, {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }, {
            scheduled: true,
            timezone: 'UTC'
        });

        this.cronTasks.push(task);

        // Execute immediately on startup
        logger.info(`Executing initial run for: ${name}`);
        handler().catch(error => {
            logger.error(`Initial run of ${name} failed`, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        });
    }

    /**
     * Start an interval-based job
     */
    private startIntervalJob(name: string, intervalMs: number, handler: () => Promise<void>): void {
        logger.info(`Starting interval job: ${name}`, { intervalMinutes: intervalMs / 1000 / 60 });

        // Execute immediately on startup
        logger.info(`Executing initial run for: ${name}`);
        handler().catch(error => {
            logger.error(`Initial run of ${name} failed`, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        });

        // Then run at intervals
        const interval = setInterval(async () => {
            try {
                await handler();
            } catch (error) {
                logger.error(`Interval job ${name} failed`, {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }, intervalMs);

        this.intervals.push(interval);
    }
}
