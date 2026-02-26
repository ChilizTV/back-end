import { injectable, inject } from 'tsyringe';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { Stream } from '../../../domain/streams/entities/Stream';
import {
  BrowseMatchesResponseDto,
  BrowseLeagueDto,
  BrowseMatchDto,
  StreamPreviewDto,
} from '../dto/BrowseMatchesDto';

@injectable()
export class GetBrowseMatchesUseCase {
  constructor(
    @inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository,
    @inject('IStreamRepository')
    private readonly streamRepository: IStreamRepository,
  ) {}

  async execute(): Promise<BrowseMatchesResponseDto> {
    const matches = await this.matchRepository.findWithin24Hours();

    // live_streams.match_id references api_football_id (integer), not the UUID primary key
    const matchIds = matches.map(m => m.toJSON().apiFootballId as number);
    const streams = await this.streamRepository.findActiveByMatchIds(matchIds);

    // Index streams by matchId for O(1) lookup
    const streamsByMatchId = new Map<number, Stream[]>();
    for (const stream of streams) {
      const matchId = stream.toJSON().matchId as number;
      if (!streamsByMatchId.has(matchId)) {
        streamsByMatchId.set(matchId, []);
      }
      streamsByMatchId.get(matchId)!.push(stream);
    }

    // Group matches by leagueId, preserving insertion order
    const leaguesMap = new Map<number, BrowseLeagueDto>();

    for (const match of matches) {
      const props = match.toJSON();
      const leagueId: number = props.league.id;

      if (!leaguesMap.has(leagueId)) {
        leaguesMap.set(leagueId, {
          league: {
            id: leagueId,
            name: props.league.name,
            logoUrl: props.league.logo ?? null,
            country: null,
          },
          matches: [],
        });
      }

      const matchStreams = streamsByMatchId.get(props.apiFootballId as number) ?? [];
      const streamsPreview: StreamPreviewDto[] = matchStreams.slice(0, 4).map(s => {
        const sJson = s.toJSON();
        return {
          streamId: sJson.id,
          streamerName: sJson.streamerName,
          thumbnailUrl: null,
          viewers: sJson.viewerCount,
        };
      });

      const browseMatch: BrowseMatchDto = {
        id: props.apiFootballId as number, // integer used in /live/:id URL (getMatchById does parseInt)
        homeTeam: {
          name: props.homeTeam.name,
          logoUrl: props.homeTeam.logo ?? null,
        },
        awayTeam: {
          name: props.awayTeam.name,
          logoUrl: props.awayTeam.logo ?? null,
        },
        kickoffAt: props.matchDate instanceof Date
          ? props.matchDate.toISOString()
          : String(props.matchDate),
        status: props.status,
        score: props.score
          ? { home: props.score.home, away: props.score.away }
          : null,
        odds: props.odds
          ? {
              home: props.odds.homeWin ?? null,
              draw: props.odds.draw ?? null,
              away: props.odds.awayWin ?? null,
            }
          : null,
        streamsPreview,
      };

      leaguesMap.get(leagueId)!.matches.push(browseMatch);
    }

    return {
      success: true,
      leagues: Array.from(leaguesMap.values()),
    };
  }
}
