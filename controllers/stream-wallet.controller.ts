import { Router, Request, Response } from 'express';
import { streamWalletService } from '../services/stream-wallet.service';

export class StreamWalletController {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Get donations for a streamer
        this.router.get('/donations/:streamerAddress', this.getStreamerDonations.bind(this));
        
        // Get subscriptions for a streamer
        this.router.get('/subscriptions/:streamerAddress', this.getStreamerSubscriptions.bind(this));
        
        // Get stats for a streamer
        this.router.get('/stats/:streamerAddress', this.getStreamerStats.bind(this));
        
        // Get donation history for a donor
        this.router.get('/donor/:donorAddress/donations', this.getDonorHistory.bind(this));
        
        // Get subscription history for a subscriber
        this.router.get('/subscriber/:subscriberAddress/subscriptions', this.getSubscriberHistory.bind(this));
    }

    /**
     * GET /stream-wallet/donations/:streamerAddress
     * Get all donations for a streamer
     */
    async getStreamerDonations(req: Request, res: Response): Promise<void> {
        try {
            const { streamerAddress } = req.params;

            if (!streamerAddress) {
                res.status(400).json({
                    success: false,
                    donations: [],
                    error: 'streamerAddress parameter is required'
                });
                return;
            }

            const result = await streamWalletService.getStreamerDonations(streamerAddress);
            res.json(result);
        } catch (error) {
            console.error('❌ Error in getStreamerDonations controller:', error);
            res.status(500).json({
                success: false,
                donations: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /stream-wallet/subscriptions/:streamerAddress
     * Get all subscriptions for a streamer
     */
    async getStreamerSubscriptions(req: Request, res: Response): Promise<void> {
        try {
            const { streamerAddress } = req.params;

            if (!streamerAddress) {
                res.status(400).json({
                    success: false,
                    subscriptions: [],
                    error: 'streamerAddress parameter is required'
                });
                return;
            }

            const result = await streamWalletService.getStreamerSubscriptions(streamerAddress);
            res.json(result);
        } catch (error) {
            console.error('❌ Error in getStreamerSubscriptions controller:', error);
            res.status(500).json({
                success: false,
                subscriptions: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /stream-wallet/stats/:streamerAddress
     * Get statistics for a streamer
     */
    async getStreamerStats(req: Request, res: Response): Promise<void> {
        try {
            const { streamerAddress } = req.params;

            if (!streamerAddress) {
                res.status(400).json({
                    success: false,
                    error: 'streamerAddress parameter is required'
                });
                return;
            }

            const result = await streamWalletService.getStreamerStats(streamerAddress);
            res.json(result);
        } catch (error) {
            console.error('❌ Error in getStreamerStats controller:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /stream-wallet/donor/:donorAddress/donations
     * Get donation history for a donor
     */
    async getDonorHistory(req: Request, res: Response): Promise<void> {
        try {
            const { donorAddress } = req.params;

            if (!donorAddress) {
                res.status(400).json({
                    success: false,
                    donations: [],
                    error: 'donorAddress parameter is required'
                });
                return;
            }

            const result = await streamWalletService.getDonorHistory(donorAddress);
            res.json(result);
        } catch (error) {
            console.error('❌ Error in getDonorHistory controller:', error);
            res.status(500).json({
                success: false,
                donations: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /stream-wallet/subscriber/:subscriberAddress/subscriptions
     * Get subscription history for a subscriber
     */
    async getSubscriberHistory(req: Request, res: Response): Promise<void> {
        try {
            const { subscriberAddress } = req.params;

            if (!subscriberAddress) {
                res.status(400).json({
                    success: false,
                    subscriptions: [],
                    error: 'subscriberAddress parameter is required'
                });
                return;
            }

            const result = await streamWalletService.getSubscriberHistory(subscriberAddress);
            res.json(result);
        } catch (error) {
            console.error('❌ Error in getSubscriberHistory controller:', error);
            res.status(500).json({
                success: false,
                subscriptions: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
