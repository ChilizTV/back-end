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
  season: number;
  venue: string | null;
  odds: any;
  betting_contract_address?: string | null;
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

  async findWithin24Hours(): Promise<Match[]> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twentyFourHoursAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: rows, error } = await supabase
      .from('matches')
      .select('*')
      .gte('match_date', twentyFourHoursAgo.toISOString())
      .lte('match_date', twentyFourHoursAhead.toISOString())
      .order('match_date', { ascending: true });

    if (error) {
      logger.error('Failed to find matches within 24 hours', { error: error.message });
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

  async findByApiFootballId(apiFootballId: number): Promise<Match | null> {
    const { data: row, error } = await supabase
      .from('matches')
      .select('*')
      .eq('api_football_id', apiFootballId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to find match by API Football ID', { error: error.message, apiFootballId });
      throw new Error('Failed to find match');
    }

    return row ? this.toDomain(row) : null;
  }

  async findByLeagueId(leagueId: number): Promise<Match[]> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twentyFourHoursAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: rows, error } = await supabase
      .from('matches')
      .select('*')
      .eq('league->>id', leagueId)
      .gte('match_date', twentyFourHoursAgo.toISOString())
      .lte('match_date', twentyFourHoursAhead.toISOString())
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
    const now = new Date();
    const twentyFourHoursAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: rows, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'NS')
      .gt('match_date', now.toISOString())
      .lte('match_date', twentyFourHoursAhead.toISOString())
      .order('match_date', { ascending: true });

    if (error) {
      logger.error('Failed to find upcoming matches', { error: error.message });
      throw new Error('Failed to find upcoming matches');
    }

    return rows ? rows.map(row => this.toDomain(row)) : [];
  }

  async save(match: Match): Promise<Match> {
    const row = this.toRow(match);
    const { id, ...insertRow } = row;

    logger.info('Saving match to database', {
      apiFootballId: insertRow.api_football_id,
      homeTeam: insertRow.home_team,
      awayTeam: insertRow.away_team,
      league: insertRow.league
    });

    const { data, error } = await supabase
      .from('matches')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      logger.error('Failed to save match', { error: error.message });
      throw new Error('Failed to save match');
    }

    logger.info('Match saved successfully', {
      id: data.id,
      homeTeam: data.home_team,
      awayTeam: data.away_team
    });

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
    const { id, ...updateRow } = row;

    const json = match.toJSON();
    const { data, error } = await supabase
      .from('matches')
      .update(updateRow)
      .eq('api_football_id', json.apiFootballId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update match', { error: error.message, apiFootballId: json.apiFootballId });
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
    const homeTeam = typeof row.home_team === 'string' ? JSON.parse(row.home_team) : row.home_team;
    const awayTeam = typeof row.away_team === 'string' ? JSON.parse(row.away_team) : row.away_team;
    const league = typeof row.league === 'string' ? JSON.parse(row.league) : row.league;

    const odds: MatchOdds | undefined = row.odds
      ? {
          homeWin: row.odds.home_win || row.odds.homeWin,
          draw: row.odds.draw,
          awayWin: row.odds.away_win || row.odds.awayWin,
        }
      : undefined;

    return Match.reconstitute({
      id: row.id,
      apiFootballId: row.api_football_id,
      homeTeamId: homeTeam?.id || 0,
      homeTeamName: homeTeam?.name || 'Unknown',
      homeTeamLogo: homeTeam?.logo,
      awayTeamId: awayTeam?.id || 0,
      awayTeamName: awayTeam?.name || 'Unknown',
      awayTeamLogo: awayTeam?.logo,
      leagueId: league?.id || 0,
      leagueName: league?.name || 'Unknown',
      leagueLogo: league?.logo,
      leagueCountry: league?.country,
      season: row.season,
      status: row.status,
      matchDate: new Date(row.match_date),
      venue: row.venue || undefined,
      homeScore: row.home_score || undefined,
      awayScore: row.away_score || undefined,
      odds,
      bettingContractAddress: row.betting_contract_address || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private toRow(match: Match): any {
    const json = match.toJSON();

    logger.info('toRow - Converting to database format', {
      homeTeam: json.homeTeam,
      awayTeam: json.awayTeam,
      league: json.league
    });

    return {
      id: json.id,
      api_football_id: json.apiFootballId,
      home_team: json.homeTeam,
      away_team: json.awayTeam,
      league: json.league,
      season: json.season,
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
      betting_contract_address: json.bettingContractAddress,
      created_at: json.createdAt,
      updated_at: json.updatedAt,
    };
  }
}
