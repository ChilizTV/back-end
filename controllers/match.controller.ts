import express, { Request, Response, Router } from 'express';
import { MatchService } from '../services';
import { ServiceResult, ServiceErrorCode } from '../services/service.result';

const matchService = new MatchService();

export class MatchController {

    async getAllMatches(req: Request, res: Response) {
        try {
            console.log('GET /matches - Fetching all matches');
            const serviceResult: ServiceResult<any[]> = await matchService.getAllMatches();
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                console.log(`Returning ${serviceResult.result?.length || 0} matches`);
                return res.status(200).json(serviceResult.result);
            } else {
                console.error('Error in getAllMatches service');
                return res.status(500).json({ message: 'Error fetching matches' });
            }
        } catch (err) {
            console.error('Exception in getAllMatches:', err);
            return res.status(500).json({ message: 'Error fetching matches' });
        }
    }

    async getMatchById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            console.log(`GET /matches/${id} - Fetching match by ID`);
            const serviceResult: ServiceResult<any> = await matchService.getMatchById(Number(id));
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                console.log(`Match ${id} found and returned`);
                return res.status(200).json(serviceResult.result);
            } else if (serviceResult.errorCode === ServiceErrorCode.notFound) {
                console.log(`Match ${id} not found or not within next 24 hours`);
                return res.status(404).json({ message: 'Match not found or not within next 24 hours' });
            } else {
                console.error(`Error fetching match ${id}`);
                return res.status(500).json({ message: 'Error fetching match' });
            }
        } catch (err) {
            console.error('Exception in getMatchById:', err);
            return res.status(500).json({ message: 'Error fetching match' });
        }
    }

    async getLiveMatches(req: Request, res: Response) {
        try {
            console.log('GET /matches/live - Fetching live matches');
            const serviceResult: ServiceResult<any[]> = await matchService.getLiveMatches();
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                console.log(`Returning ${serviceResult.result?.length || 0} live matches`);
                return res.status(200).json(serviceResult.result);
            } else {
                console.error('Error in getLiveMatches service');
                return res.status(500).json({ message: 'Error fetching live matches' });
            }
        } catch (err) {
            console.error('Exception in getLiveMatches:', err);
            return res.status(500).json({ message: 'Error fetching live matches' });
        }
    }

    async getUpcomingMatches(req: Request, res: Response) {
        try {
            console.log('GET /matches/upcoming - Fetching upcoming matches');
            const serviceResult: ServiceResult<any[]> = await matchService.getUpcomingMatches();
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                console.log(`Returning ${serviceResult.result?.length || 0} upcoming matches`);
                return res.status(200).json(serviceResult.result);
            } else {
                console.error('Error in getUpcomingMatches service');
                return res.status(500).json({ message: 'Error fetching upcoming matches' });
            }
        } catch (err) {
            console.error('Exception in getUpcomingMatches:', err);
            return res.status(500).json({ message: 'Error fetching upcoming matches' });
        }
    }

    async getMatchesByLeague(req: Request, res: Response) {
        try {
            const { league } = req.params;
            console.log(`GET /matches/league/${league} - Fetching matches by league`);
            const serviceResult: ServiceResult<any[]> = await matchService.getMatchesByLeague(league);
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                console.log(`Returning ${serviceResult.result?.length || 0} matches for league ${league}`);
                return res.status(200).json(serviceResult.result);
            } else {
                console.error(`Error in getMatchesByLeague service for league ${league}`);
                return res.status(500).json({ message: 'Error fetching matches by league' });
            }
        } catch (err) {
            console.error('Exception in getMatchesByLeague:', err);
            return res.status(500).json({ message: 'Error fetching matches by league' });
        }
    }

    async getMatchesInNext24Hours(req: Request, res: Response) {
        try {
            console.log('GET /matches/next-24h - Fetching matches in next 24 hours');
            const serviceResult: ServiceResult<any[]> = await matchService.getMatchesInNext24Hours();
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                console.log(`Returning ${serviceResult.result?.length || 0} matches in next 24h`);
                return res.status(200).json(serviceResult.result);
            } else {
                console.error('Error in getMatchesInNext24Hours service');
                return res.status(500).json({ message: 'Error fetching matches in next 24 hours' });
            }
        } catch (err) {
            console.error('Exception in getMatchesInNext24Hours:', err);
            return res.status(500).json({ message: 'Error fetching matches in next 24 hours' });
        }
    }

    async syncMatchesFromApi(req: Request, res: Response) {
        try {
            console.log('POST /matches/sync - Syncing matches from API');
            const serviceResult: ServiceResult<void> = await matchService.syncMatchesFromApi();
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                console.log('Matches synced successfully');
                return res.status(200).json({ message: 'Matches synced successfully' });
            } else {
                console.error('Error in syncMatchesFromApi service');
                return res.status(500).json({ message: 'Error syncing matches from API' });
            }
        } catch (err) {
            console.error('Exception in syncMatchesFromApi:', err);
            return res.status(500).json({ message: 'Error syncing matches from API' });
        }
    }

    async getMatchesByDateRange(req: Request, res: Response) {
        try {
            const { startDate, endDate } = req.query;
            console.log(`GET /matches/date-range - Fetching matches by date range: ${startDate} to ${endDate}`);
            
            if (!startDate || !endDate) {
                console.error('Missing startDate or endDate parameters');
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const start = new Date(startDate as string);
            const end = new Date(endDate as string);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                console.error('Invalid date format provided');
                return res.status(400).json({ message: 'Invalid date format' });
            }

            const serviceResult: ServiceResult<any[]> = await matchService.getMatchesByDateRange(start, end);
            if (serviceResult.errorCode === ServiceErrorCode.success) {
                console.log(`Returning ${serviceResult.result?.length || 0} matches for date range`);
                return res.status(200).json(serviceResult.result);
            } else {
                console.error('Error in getMatchesByDateRange service');
                return res.status(500).json({ message: 'Error fetching matches by date range' });
            }
        } catch (err) {
            console.error('Exception in getMatchesByDateRange:', err);
            return res.status(500).json({ message: 'Error fetching matches by date range' });
        }
    }

    async getCacheStats(req: Request, res: Response) {
        try {
            console.log('GET /matches/cache/stats - Fetching cache statistics');
            const cacheStats = matchService.getCacheStats();
            console.log('Cache statistics retrieved successfully');
            return res.status(200).json({
                message: 'Cache statistics retrieved successfully',
                stats: cacheStats
            });
        } catch (err) {
            console.error('Exception in getCacheStats:', err);
            return res.status(500).json({ message: 'Error fetching cache statistics' });
        }
    }

    buildRoutes(): Router {
        const router = express.Router();
        
        router.get('/', this.getAllMatches.bind(this));
        router.get('/live', this.getLiveMatches.bind(this));
        router.get('/upcoming', this.getUpcomingMatches.bind(this));
        router.get('/next-24h', this.getMatchesInNext24Hours.bind(this));
        router.get('/league/:league', this.getMatchesByLeague.bind(this));
        router.get('/date-range', this.getMatchesByDateRange.bind(this));
        router.get('/:id', this.getMatchById.bind(this));
        
        // Route pour les statistiques du cache
        router.get('/cache/stats', this.getCacheStats.bind(this));
        
        router.post('/sync', this.syncMatchesFromApi.bind(this));
        
        return router;
    }
} 