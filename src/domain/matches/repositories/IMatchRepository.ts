import { Match } from '../entities/Match';

export interface MatchStats {
  totalMatches: number;
  liveMatches: number;
  upcomingMatches: number;
  finishedMatches: number;
}

export interface IMatchRepository {
  findAll(): Promise<Match[]>;
  findWithin24Hours(): Promise<Match[]>;
  findById(id: number): Promise<Match | null>;
  findByApiFootballId(apiFootballId: number): Promise<Match | null>;
  findByLeagueId(leagueId: number): Promise<Match[]>;
  findLive(): Promise<Match[]>;
  findUpcoming(): Promise<Match[]>;
  save(match: Match): Promise<Match>;
  saveMany(matches: Match[]): Promise<Match[]>;
  update(match: Match): Promise<Match>;
  deleteOldMatches(before: Date): Promise<number>;
  getStats(): Promise<MatchStats>;
}
