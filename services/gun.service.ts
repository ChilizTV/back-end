import Gun from 'gun';
import { Match } from '../models';

interface GunMatch {
    id: string;
    api_football_id: number;
    home_team: string;
    away_team: string;
    home_score?: number;
    away_score?: number;
    match_date: string;
    status: string;
    league: string;
    season: string;
    venue?: string;
    referee?: string;
    created_at: string;
    updated_at: string;
}

interface GunAck {
    err?: any;
    ok?: number;
}

export class GunService {
    private gun: any;
    private matches: any;

    constructor() {
        this.gun = Gun({
            peers: ['http://localhost:8765/gun'],
            localStorage: false
        });

        this.matches = this.gun.get('matches');
    }

    private sequelizeToGunMatch(match: Match): GunMatch {
        return {
            id: match.id.toString(),
            api_football_id: match.api_football_id,
            home_team: match.home_team,
            away_team: match.away_team,
            home_score: match.home_score,
            away_score: match.away_score,
            match_date: match.match_date.toISOString(),
            status: match.status,
            league: match.league,
            season: match.season,
            venue: match.venue,
            referee: match.referee,
            created_at: match.created_at.toISOString(),
            updated_at: match.updated_at.toISOString()
        };
    }

    private gunMatchToSequelize(gunMatch: GunMatch): Partial<Match> {
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

    async saveMatch(match: Match): Promise<void> {
        return new Promise((resolve, reject) => {
            const gunMatch = this.sequelizeToGunMatch(match);
            
            this.matches.get(match.id.toString()).put(gunMatch, (ack: GunAck) => {
                if (ack.err) {
                    console.error('Error saving match to GUN:', ack.err);
                    reject(ack.err);
                } else {
                    console.log('Match saved to GUN successfully');
                    resolve();
                }
            });
        });
    }

    async getMatchById(id: string): Promise<GunMatch | null> {
        return new Promise((resolve, reject) => {
            this.matches.get(id).once((data: any, ack: GunAck) => {
                if (ack.err) {
                    console.error('Error getting match from GUN:', ack.err);
                    reject(ack.err);
                } else if (data) {
                    resolve(data as GunMatch);
                } else {
                    resolve(null);
                }
            });
        });
    }

    async getAllMatches(): Promise<GunMatch[]> {
        return new Promise((resolve, reject) => {
            const matches: GunMatch[] = [];
            
            this.matches.map().once((data: any, key: any) => {
                if (data && key) {
                    matches.push(data as GunMatch);
                }
            });

            setTimeout(() => {
                resolve(matches);
            }, 1000);
        });
    }

    async getMatchesInNext24Hours(): Promise<GunMatch[]> {
        return new Promise((resolve, reject) => {
            const now = new Date();
            const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const matches: GunMatch[] = [];
            
            this.matches.map().once((data: any, key: any) => {
                if (data && key) {
                    const match = data as GunMatch;
                    const matchDate = new Date(match.match_date);
                    
                    if (matchDate >= now && matchDate <= next24Hours && match.status === 'scheduled') {
                        matches.push(match);
                    }
                }
            });

            setTimeout(() => {
                resolve(matches);
            }, 1000);
        });
    }

    async getLiveMatches(): Promise<GunMatch[]> {
        return new Promise((resolve, reject) => {
            const matches: GunMatch[] = [];
            
            this.matches.map().once((data: any, key: any) => {
                if (data && key) {
                    const match = data as GunMatch;
                    if (match.status === 'live') {
                        matches.push(match);
                    }
                }
            });

            setTimeout(() => {
                resolve(matches);
            }, 1000);
        });
    }

    async updateMatchStatus(id: string, status: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.matches.get(id).once((data: any, ack: GunAck) => {
                if (ack.err) {
                    reject(ack.err);
                } else if (data) {
                    const updatedMatch = {
                        ...data,
                        status,
                        updated_at: new Date().toISOString()
                    };
                    
                    this.matches.get(id).put(updatedMatch, (updateAck: GunAck) => {
                        if (updateAck.err) {
                            reject(updateAck.err);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    reject(new Error('Match not found'));
                }
            });
        });
    }

    // Synchroniser les matchs depuis Sequelize vers GUN
    async syncFromSequelize(sequelizeMatches: Match[]): Promise<void> {
        for (const match of sequelizeMatches) {
            await this.saveMatch(match);
        }
        console.log(`Synced ${sequelizeMatches.length} matches to GUN`);
    }

    // Obtenir l'instance GUN pour d'autres utilisations
    getGunInstance(): any {
        return this.gun;
    }
} 