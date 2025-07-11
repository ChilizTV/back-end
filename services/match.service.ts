import { ServiceResult, ServiceErrorCode } from './service.result';
import { Match } from '../models';
import { GunService } from './gun.service';
import axios from 'axios';

interface ApiFootballMatch {
    fixture: {
        id: number;
        date: string;
        status: { short: string };
        venue: { name: string };
    };
    teams: {
        home: { name: string };
        away: { name: string };
    };
    goals: {
        home: number | null;
        away: number | null;
    };
    league: {
        name: string;
        season: number;
    };
    referee: string;
}

export class MatchService {
    private readonly API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';
    private readonly API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
    private gunService: GunService;

    constructor() {
        this.gunService = new GunService();
    }

    async getAllMatches(): Promise<ServiceResult<Match[]>> {
        try {
            const matches = await Match.findAll({
                order: [['match_date', 'DESC']]
            });
            return ServiceResult.success(matches);
        } catch (error) {
            console.error('Error fetching all matches:', error);
            return ServiceResult.failed();
        }
    }

    async getMatchById(id: number): Promise<ServiceResult<Match>> {
        try {
            const match = await Match.findByPk(id);
            if (!match) {
                return ServiceResult.notFound();
            }
            return ServiceResult.success(match);
        } catch (error) {
            console.error('Error fetching match by id:', error);
            return ServiceResult.failed();
        }
    }

    async getLiveMatches(): Promise<ServiceResult<Match[]>> {
        try {
            // Utiliser GUN.js pour récupérer les matchs en cours
            const gunMatches = await this.gunService.getLiveMatches();
            const matches = gunMatches.map(gunMatch => this.gunMatchToSequelize(gunMatch));
            return ServiceResult.success(matches as Match[]);
        } catch (error) {
            console.error('Error fetching live matches:', error);
            return ServiceResult.failed();
        }
    }

    async getUpcomingMatches(): Promise<ServiceResult<Match[]>> {
        try {
            const matches = await Match.findAll({
                where: { status: 'scheduled' },
                order: [['match_date', 'ASC']]
            });
            return ServiceResult.success(matches);
        } catch (error) {
            console.error('Error fetching upcoming matches:', error);
            return ServiceResult.failed();
        }
    }

    async getMatchesInNext24Hours(): Promise<ServiceResult<Match[]>> {
        try {
            // Utiliser GUN.js pour récupérer les matchs dans les 24h
            const gunMatches = await this.gunService.getMatchesInNext24Hours();
            const matches = gunMatches.map(gunMatch => this.gunMatchToSequelize(gunMatch));
            return ServiceResult.success(matches as Match[]);
        } catch (error) {
            console.error('Error fetching matches in next 24 hours:', error);
            return ServiceResult.failed();
        }
    }

    async getMatchesByLeague(league: string): Promise<ServiceResult<Match[]>> {
        try {
            const matches = await Match.findAll({
                where: { league },
                order: [['match_date', 'DESC']]
            });
            return ServiceResult.success(matches);
        } catch (error) {
            console.error('Error fetching matches by league:', error);
            return ServiceResult.failed();
        }
    }

    async syncMatchesFromApi(): Promise<ServiceResult<void>> {
        try {
            if (!this.API_FOOTBALL_KEY) {
                console.error('API_FOOTBALL_KEY not configured');
                return ServiceResult.failed();
            }

            // Récupérer les matchs des 7 prochains jours pour avoir une marge
            const today = new Date();
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            const response = await axios.get(`${this.API_FOOTBALL_BASE_URL}/fixtures`, {
                headers: {
                    'x-rapidapi-key': this.API_FOOTBALL_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                },
                params: {
                    from: today.toISOString().split('T')[0],
                    to: nextWeek.toISOString().split('T')[0],
                    status: 'NS-LIVE-FT'
                }
            });

            const apiMatches: ApiFootballMatch[] = response.data.response || [];

            for (const apiMatch of apiMatches) {
                await this.upsertMatchFromApi(apiMatch);
            }

            // Synchroniser avec GUN.js après avoir mis à jour Sequelize
            const allMatches = await Match.findAll();
            await this.gunService.syncFromSequelize(allMatches);

            return ServiceResult.success(undefined);
        } catch (error) {
            console.error('Error syncing matches from API:', error);
            return ServiceResult.failed();
        }
    }

    private async upsertMatchFromApi(apiMatch: ApiFootballMatch): Promise<void> {
        try {
            const matchData = {
                api_football_id: apiMatch.fixture.id,
                home_team: apiMatch.teams.home.name,
                away_team: apiMatch.teams.away.name,
                home_score: apiMatch.goals.home,
                away_score: apiMatch.goals.away,
                match_date: new Date(apiMatch.fixture.date),
                status: this.mapApiStatusToStatus(apiMatch.fixture.status.short),
                league: apiMatch.league.name,
                season: apiMatch.league.season.toString(),
                venue: apiMatch.fixture.venue?.name,
                referee: apiMatch.referee
            };

            await Match.upsert(matchData);
        } catch (error) {
            console.error('Error upserting match from API:', error);
        }
    }

    private mapApiStatusToStatus(apiStatus: string): string {
        switch (apiStatus) {
            case 'NS':
                return 'scheduled';
            case '1H':
            case '2H':
            case 'HT':
            case 'ET':
            case 'P':
            case 'BT':
                return 'live';
            case 'FT':
            case 'AET':
            case 'PEN':
                return 'finished';
            case 'CANC':
            case 'ABD':
            case 'AWD':
            case 'WO':
                return 'cancelled';
            default:
                return 'scheduled';
        }
    }

    async updateMatchStatus(id: number, status: string): Promise<ServiceResult<Match>> {
        try {
            const match = await Match.findByPk(id);
            if (!match) {
                return ServiceResult.notFound();
            }

            match.status = status;
            await match.save();

            // Mettre à jour aussi dans GUN.js
            await this.gunService.updateMatchStatus(id.toString(), status);

            return ServiceResult.success(match);
        } catch (error) {
            console.error('Error updating match status:', error);
            return ServiceResult.failed();
        }
    }

    async getMatchesByDateRange(startDate: Date, endDate: Date): Promise<ServiceResult<Match[]>> {
        try {
            const matches = await Match.findAll({
                where: {
                    match_date: {
                        [require('sequelize').Op.between]: [startDate, endDate]
                    }
                },
                order: [['match_date', 'ASC']]
            });
            return ServiceResult.success(matches);
        } catch (error) {
            console.error('Error fetching matches by date range:', error);
            return ServiceResult.failed();
        }
    }

    // Convertir un GunMatch en Match Sequelize
    private gunMatchToSequelize(gunMatch: any): Partial<Match> {
        return {
            id: parseInt(gunMatch.id),
            api_football_id: gunMatch.api_football_id,
            home_team: gunMatch.home_team,
            away_team: gunMatch.away_team,
            home_score: gunMatch.home_score,
            away_score: gunMatch.away_score,
            match_date: new Date(gunMatch.match_date),
            status: gunMatch.status,
            league: gunMatch.league,
            season: gunMatch.season,
            venue: gunMatch.venue,
            referee: gunMatch.referee,
            created_at: new Date(gunMatch.created_at),
            updated_at: new Date(gunMatch.updated_at)
        };
    }
} 