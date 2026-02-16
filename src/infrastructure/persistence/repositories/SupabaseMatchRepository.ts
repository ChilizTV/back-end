import { injectable } from 'tsyringe';
import { supabaseClient as supabase } from '../../database/supabase/client';
import { Match, MatchOdds } from '../../../domain/matches/entities/Match';
import { IMatchRepository, MatchStats } from '../../../domain/matches/repositories/IMatchRepository';
import { logger } from '../../logging/logger';

interface MatchRow {
  id: number;
  api_football_id: number;
  home_team: any;
  away_team: any;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  status: string;
  league: any;
  venue: string | null;
  odds: any;
  created_at: string;
  updated_at: string;
}

@injectable()
export class SupabaseMatchRepository implements IMatchRepository {
  async findAll(): Promise<Match[]> {
    const { data: rows, error } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true });

    if (error) {
      logger.error('Failed to find all matches', { error: error.message });
      throw new Error('Failed to find matches');
    }

    return rows ? rows.map(row => this.toDomain(row)) : [];
  }

  async findById(id: number): Promise<Match | null> {
    const { data: row, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error('Failed to find match by id', { error: error.message, id });
      throw new Error('Failed to find match');
    }

    return row ? this.toDomain(row) : null;
  }

  async findByLeagueId(leagueId: number): Promise<Match[]> {
    const { data: rows, error } = await supabase
      .from('matches')
      .select('*')
      .eq('league->>id', leagueId)
      .order('match_date', { ascending: true });

    if (error) {
      logger.error('Failed to find matches by league', { error: error.message, leagueId });
      throw new Error('Failed to find matches');
    }

    return rows ? rows.map(row => this.toDomain(row)) : [];
  }

  async findLive(): Promise<Match[]> {
    const { data: rows, error } = await supabase
      .from('matches')
      .select('*')
      .in('status', ['1H', '2H', 'HT'])
      .order('match_date', { ascending: true });

    if (error) {
      logger.error('Failed to find live matches', { error: error.message });
      throw new Error('Failed to find live matches');
    }

    return rows ? rows.map(row => this.toDomain(row)) : [];
  }

  async findUpcoming(): Promise<Match[]> {
    const now = new Date().toISOString();

    const { data: rows, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'NS')
      .gt('match_date', now)
      .order('match_date', { ascending: true });

    if (error) {
      logger.error('Failed to find upcoming matches', { error: error.message });
      throw new Error('Failed to find upcoming matches');
    }

    return rows ? rows.map(row => this.toDomain(row)) : [];
  }

  async save(match: Match): Promise<Match> {
    const row = this.toRow(match);

    const { data, error } = await supabase
      .from('matches')
      .insert(row)
      .select()
      .single();

    if (error) {
      logger.error('Failed to save match', { error: error.message });
      throw new Error('Failed to save match');
    }

    return this.toDomain(data);
  }

  async saveMany(matches: Match[]): Promise<Match[]> {
    const rows = matches.map(m => this.toRow(m));

    const { data, error } = await supabase
      .from('matches')
      .upsert(rows, { onConflict: 'id' })
      .select();

    if (error) {
      logger.error('Failed to save matches', { error: error.message });
      throw new Error('Failed to save matches');
    }

    return data ? data.map(row => this.toDomain(row)) : [];
  }

  async update(match: Match): Promise<Match> {
    const row = this.toRow(match);

    const { data, error } = await supabase
      .from('matches')
      .update(row)
      .eq('id', match.getId())
      .select()
      .single();

    if (error) {
      logger.error('Failed to update match', { error: error.message, id: match.getId() });
      throw new Error('Failed to update match');
    }

    return this.toDomain(data);
  }

  async deleteOldMatches(before: Date): Promise<number> {
    const { data, error } = await supabase
      .from('matches')
      .delete()
      .lt('match_date', before.toISOString())
      .select('id');

    if (error) {
      logger.error('Failed to delete old matches', { error: error.message });
      throw new Error('Failed to delete old matches');
    }

    return data ? data.length : 0;
  }

  async getStats(): Promise<MatchStats> {
    const allMatches = await this.findAll();

    const totalMatches = allMatches.length;
    const liveMatches = allMatches.filter(m => m.isLive()).length;
    const upcomingMatches = allMatches.filter(m => m.isUpcoming()).length;
    const finishedMatches = allMatches.filter(m => m.isFinished()).length;

    return {
      totalMatches,
      liveMatches,
      upcomingMatches,
      finishedMatches,
    };
  }

  private toDomain(row: MatchRow): Match {
    const odds: MatchOdds | undefined = row.odds
      ? {
          homeWin: row.odds.home_win || row.odds.homeWin,
          draw: row.odds.draw,
          awayWin: row.odds.away_win || row.odds.awayWin,
        }
      : undefined;

    return Match.reconstitute({
      id: row.id,
      homeTeamId: row.home_team?.id || 0,
      homeTeamName: row.home_team?.name || 'Unknown',
      homeTeamLogo: row.home_team?.logo || '',
      awayTeamId: row.away_team?.id || 0,
      awayTeamName: row.away_team?.name || 'Unknown',
      awayTeamLogo: row.away_team?.logo || '',
      leagueId: row.league?.id || 0,
      leagueName: row.league?.name || 'Unknown',
      leagueLogo: row.league?.logo || '',
      status: row.status,
      matchDate: new Date(row.match_date),
      venue: row.venue || undefined,
      homeScore: row.home_score || undefined,
      awayScore: row.away_score || undefined,
      odds,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private toRow(match: Match): any {
    const json = match.toJSON();
    return {
      id: json.id,
      api_football_id: json.id,
      home_team: {
        id: json.homeTeam.id,
        name: json.homeTeam.name,
        logo: json.homeTeam.logo,
      },
      away_team: {
        id: json.awayTeam.id,
        name: json.awayTeam.name,
        logo: json.awayTeam.logo,
      },
      league: {
        id: json.league.id,
        name: json.league.name,
        logo: json.league.logo,
      },
      status: json.status,
      match_date: json.matchDate,
      venue: json.venue,
      home_score: json.score?.home,
      away_score: json.score?.away,
      odds: json.odds ? {
        home_win: json.odds.homeWin,
        draw: json.odds.draw,
        away_win: json.odds.awayWin,
      } : null,
      created_at: json.createdAt,
      updated_at: json.updatedAt,
    };
  }
}
