import express, { Request, Response, Router } from 'express';
import { MatchService } from '../services';
import { ServiceResult, ServiceErrorCode } from '../services/service.result';
import { Match } from '../models';

const matchService = new MatchService();

export class MatchController {

    async getAllMatches(req: Request, res: Response) {
        try {
            const serviceResult: ServiceResult<Match[]> = await matchService.getAllMatches();
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                return res.status(200).json(serviceResult.result);
            } else {
                return res.status(500).json({ message: 'Error fetching matches' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Error fetching matches' });
        }
    }

    async getMatchById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const serviceResult: ServiceResult<Match> = await matchService.getMatchById(Number(id));
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                return res.status(200).json(serviceResult.result);
            } else if (serviceResult.errorCode === ServiceErrorCode.notFound) {
                return res.status(404).json({ message: 'Match not found' });
            } else {
                return res.status(500).json({ message: 'Error fetching match' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Error fetching match' });
        }
    }

    async getLiveMatches(req: Request, res: Response) {
        try {
            const serviceResult: ServiceResult<Match[]> = await matchService.getLiveMatches();
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                return res.status(200).json(serviceResult.result);
            } else {
                return res.status(500).json({ message: 'Error fetching live matches' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Error fetching live matches' });
        }
    }

    async getUpcomingMatches(req: Request, res: Response) {
        try {
            const serviceResult: ServiceResult<Match[]> = await matchService.getUpcomingMatches();
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                return res.status(200).json(serviceResult.result);
            } else {
                return res.status(500).json({ message: 'Error fetching upcoming matches' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Error fetching upcoming matches' });
        }
    }

    async getMatchesInNext24Hours(req: Request, res: Response) {
        try {
            const serviceResult: ServiceResult<Match[]> = await matchService.getMatchesInNext24Hours();
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                return res.status(200).json(serviceResult.result);
            } else {
                return res.status(500).json({ message: 'Error fetching matches in next 24 hours' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Error fetching matches in next 24 hours' });
        }
    }

    async getMatchesByLeague(req: Request, res: Response) {
        try {
            const { league } = req.params;
            const serviceResult: ServiceResult<Match[]> = await matchService.getMatchesByLeague(league);
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                return res.status(200).json(serviceResult.result);
            } else {
                return res.status(500).json({ message: 'Error fetching matches by league' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Error fetching matches by league' });
        }
    }

    async syncMatchesFromApi(req: Request, res: Response) {
        try {
            const serviceResult: ServiceResult<void> = await matchService.syncMatchesFromApi();
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                return res.status(200).json({ message: 'Matches synced successfully' });
            } else {
                return res.status(500).json({ message: 'Error syncing matches from API' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Error syncing matches from API' });
        }
    }

    async updateMatchStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            if (!status || !['scheduled', 'live', 'finished', 'cancelled'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }

            const serviceResult: ServiceResult<Match> = await matchService.updateMatchStatus(Number(id), status);
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                return res.status(200).json(serviceResult.result);
            } else if (serviceResult.errorCode === ServiceErrorCode.notFound) {
                return res.status(404).json({ message: 'Match not found' });
            } else {
                return res.status(500).json({ message: 'Error updating match status' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Error updating match status' });
        }
    }

    async getMatchesByDateRange(req: Request, res: Response) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const start = new Date(startDate as string);
            const end = new Date(endDate as string);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ message: 'Invalid date format' });
            }

            const serviceResult: ServiceResult<Match[]> = await matchService.getMatchesByDateRange(start, end);
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                return res.status(200).json(serviceResult.result);
            } else {
                return res.status(500).json({ message: 'Error fetching matches by date range' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Error fetching matches by date range' });
        }
    }

    buildRoutes(): Router {
        const router = express.Router();
        
        router.get('/', this.getAllMatches.bind(this));
        router.get('/live', this.getLiveMatches.bind(this));
        router.get('/upcoming', this.getUpcomingMatches.bind(this));
        router.get('/next24h', this.getMatchesInNext24Hours.bind(this));
        router.get('/league/:league', this.getMatchesByLeague.bind(this));
        router.get('/date-range', this.getMatchesByDateRange.bind(this));
        router.get('/:id', this.getMatchById.bind(this));
        
        // Route pour synchroniser depuis l'API (nécessite une authentification admin)
        router.post('/sync', this.syncMatchesFromApi.bind(this));
        
        // Route pour mettre à jour le statut d'un match (nécessite une authentification admin)
        router.put('/:id/status', express.json(), this.updateMatchStatus.bind(this));
        
        return router;
    }
} 