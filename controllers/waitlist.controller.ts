import { Request, Response, Router } from 'express';
import { waitlistService } from '../services/waitlist.service';
import { ServiceErrorCode } from '../services/service.result';

export class WaitlistController {
    private router: Router;

    constructor() {
        this.router = Router();
        this.buildRoutes();
    }

    private buildRoutes(): void {
        this.router.post('/', this.joinWaitlist.bind(this));
        this.router.get('/check-access', this.checkAccess.bind(this));
        this.router.get('/stats', this.getStats.bind(this));
    }

    getRouter(): Router {
        return this.router;
    }

    private async joinWaitlist(req: Request, res: Response): Promise<void> {
        try {
            const { email, walletAddress, source } = req.body;

            if (!email || typeof email !== 'string') {
                res.status(400).json({ success: false, error: 'Email is required' });
                return;
            }

            const normalizedEmail = email.trim().toLowerCase();

            const result = await waitlistService.addToWaitlist({
                email: normalizedEmail,
                walletAddress,
                source
            });

            if (result.errorCode === ServiceErrorCode.success && result.result) {
                res.status(201).json({
                    success: true,
                    entry: result.result
                });
                return;
            }

            res.status(500).json({ success: false, error: 'Unable to join waitlist' });
        } catch (error: any) {
            console.error('❌ Error in joinWaitlist:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    private async checkAccess(req: Request, res: Response): Promise<void> {
        try {
            const email = req.query.email as string | undefined;
            const walletAddress = req.query.walletAddress as string | undefined;

            const result = await waitlistService.checkAccess({
                email: email?.trim().toLowerCase(),
                walletAddress
            });

            if (result.errorCode === ServiceErrorCode.invalidParameter) {
                res.status(400).json({
                    success: false,
                    error: 'email or walletAddress is required'
                });
                return;
            }

            if (result.errorCode !== ServiceErrorCode.success || !result.result) {
                res.status(200).json({
                    success: true,
                    hasAccess: false
                });
                return;
            }

            res.status(200).json({
                success: true,
                hasAccess: result.result.hasAccess,
                entry: result.result.entry
            });
        } catch (error: any) {
            console.error('❌ Error in checkAccess:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    private async getStats(req: Request, res: Response): Promise<void> {
        try {
            const result = await waitlistService.getStats();

            if (result.errorCode !== ServiceErrorCode.success || !result.result) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch stats'
                });
                return;
            }

            res.status(200).json({
                success: true,
                stats: result.result
            });
        } catch (error: any) {
            console.error('❌ Error in getStats:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
}

