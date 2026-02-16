import { Request, Response, Router } from 'express';
import { MatchService } from '../services/match.service';
import { ServiceResult, ServiceErrorCode } from '../services/service.result';
import { MatchWithOdds } from '../src/infrastructure/external/types/ApiFootball.types';
import { MatchStats, MatchSyncResult } from '../models/supabase-match.model';

export class MatchController {
    private router: Router;
    private matchService: MatchService;

    constructor() {
        this.router = Router();
        this.matchService = new MatchService();
        this.buildRoutes();
    }

    private async getAllMatches(req: Request, res: Response): Promise<void> {
        try {
            console.log('📋 GET /matches - Fetching all matches');
            
            const result = await this.matchService.getMatchesFromSupabase();
            
            if (result.errorCode === ServiceErrorCode.success) {
                res.json({
                    success: true,
                    matches: result.result,
                    count: result.result?.length || 0,
                    timestamp: Date.now()
                });
            } else {
                res.status(500).json({ error: 'Failed to fetch matches' });
            }
        } catch (error) {
            console.error('❌ Error in getAllMatches:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async getLiveMatches(req: Request, res: Response): Promise<void> {
        try {
            console.log('📺 GET /matches/live - Fetching live matches');
            
            const result = await this.matchService.getMatchesFromSupabase();
            
            if (result.errorCode === ServiceErrorCode.success) {
                const matches = result.result as MatchWithOdds[];
                const liveMatches = matches.filter(match => 
                    match.status === '1H' || match.status === '2H' || match.status === 'HT'
                );
                
                res.json({
                    success: true,
                    matches: liveMatches,
                    count: liveMatches.length,
                    timestamp: Date.now()
                });
            } else {
                res.status(500).json({ error: 'Failed to fetch live matches' });
            }
        } catch (error) {
            console.error('❌ Error in getLiveMatches:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async getUpcomingMatches(req: Request, res: Response): Promise<void> {
        try {
            console.log('⏰ GET /matches/upcoming - Fetching upcoming matches');
            
            const result = await this.matchService.getMatchesFromSupabase();
            
            if (result.errorCode === ServiceErrorCode.success) {
                const matches = result.result as MatchWithOdds[];
                const now = new Date();
                const upcomingMatches = matches.filter(match => {
                    const matchDate = new Date(match.match_date);
                    return matchDate > now && match.status === 'NS';
                });
                
                res.json({
                    success: true,
                    matches: upcomingMatches,
                    count: upcomingMatches.length,
                    timestamp: Date.now()
                });
            } else {
                res.status(500).json({ error: 'Failed to fetch upcoming matches' });
            }
        } catch (error) {
            console.error('❌ Error in getUpcomingMatches:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async getMatchById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            console.log(`🔍 GET /matches/${id} - Fetching match by ID`);
            
            const result = await this.matchService.getMatchesFromSupabase();
            
            if (result.errorCode === ServiceErrorCode.success) {
                const matches = result.result as MatchWithOdds[];
                const match = matches.find(m => m.api_football_id === parseInt(id));
                
                if (!match) {
                    res.status(404).json({ error: 'Match not found' });
                    return;
                }
                
                res.json({
                    success: true,
                    match,
                    timestamp: Date.now()
                });
            } else {
                res.status(500).json({ error: 'Failed to fetch match' });
            }
        } catch (error) {
            console.error('❌ Error in getMatchById:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async getMatchesByLeague(req: Request, res: Response): Promise<void> {
        try {
            const { league } = req.params;
            console.log(`🏆 GET /matches/league/${league} - Fetching matches by league`);
            
            const result = await this.matchService.getMatchesFromSupabase();
            
            if (result.errorCode === ServiceErrorCode.success) {
                const matches = result.result as MatchWithOdds[];
                const leagueMatches = matches.filter(match => 
                    match.league.toLowerCase().includes(league.toLowerCase())
                );
                
                res.json({
                    success: true,
                    matches: leagueMatches,
                    count: leagueMatches.length,
                    league,
                    timestamp: Date.now()
                });
            } else {
                res.status(500).json({ error: 'Failed to fetch league matches' });
            }
        } catch (error) {
            console.error('❌ Error in getMatchesByLeague:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async syncMatches(req: Request, res: Response): Promise<void> {
        try {
            console.log('🔄 POST /matches/sync - Starting match synchronization');
            
            const result = await this.matchService.syncMatches();
            
            if (result.errorCode === ServiceErrorCode.success) {
                const syncResult = result.result as MatchSyncResult;
                
                res.json({
                    success: true,
                    message: 'Match synchronization completed',
                    stored: syncResult.stored,
                    cleaned: syncResult.cleaned,
                    timestamp: Date.now()
                });
            } else {
                res.status(500).json({ error: 'Failed to sync matches' });
            }
        } catch (error) {
            console.error('❌ Error in syncMatches:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async getMatchStats(req: Request, res: Response): Promise<void> {
        try {
            console.log('📊 GET /matches/stats/summary - Fetching match statistics');
            
            const result = await this.matchService.getMatchesFromSupabase();
            
            if (result.errorCode === ServiceErrorCode.success) {
                const matches = result.result as MatchWithOdds[];
                const now = new Date();
                
                const stats: MatchStats = {
                    total: matches.length,
                    live: matches.filter(m => m.status === '1H' || m.status === '2H' || m.status === 'HT').length,
                    upcoming: matches.filter(m => {
                        const matchDate = new Date(m.match_date);
                        return matchDate > now && m.status === 'NS';
                    }).length,
                    finished: matches.filter(m => m.status === 'FT' || m.status === 'AET' || m.status === 'PEN').length,
                    leagues: [...new Set(matches.map(m => m.league))].length,
                    timestamp: Date.now()
                };
                
                res.json({
                    success: true,
                    stats,
                    timestamp: Date.now()
                });
            } else {
                res.status(500).json({ error: 'Failed to fetch match statistics' });
            }
        } catch (error) {
            console.error('❌ Error in getMatchStats:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    public getRouter(): Router {
        return this.router;
    }

    private buildRoutes(): void {
        // Get all matches
        this.router.get('/', this.getAllMatches.bind(this));
        
        // Get matches by status
        this.router.get('/live', this.getLiveMatches.bind(this));
        this.router.get('/upcoming', this.getUpcomingMatches.bind(this));
        
        // Get match by ID
        this.router.get('/:id', this.getMatchById.bind(this));
        
        // Get matches by league
        this.router.get('/league/:league', this.getMatchesByLeague.bind(this));
        
        // Sync matches from API
        this.router.post('/sync', this.syncMatches.bind(this));
        
        // Get match statistics
        this.router.get('/stats/summary', this.getMatchStats.bind(this));
    }
} 