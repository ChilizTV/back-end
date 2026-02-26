export interface StreamPreviewDto {
  streamId: string;
  streamerName: string;
  thumbnailUrl: string | null;
  viewers: number;
}

export interface BrowseMatchDto {
  id: number;
  homeTeam: { name: string; logoUrl: string | null };
  awayTeam: { name: string; logoUrl: string | null };
  kickoffAt: string;
  status: string;
  score: { home: number; away: number } | null;
  odds: { home: number | null; draw: number | null; away: number | null } | null;
  streamsPreview: StreamPreviewDto[];
}

export interface BrowseLeagueDto {
  league: {
    id: number;
    name: string;
    logoUrl: string | null;
    country: string | null;
  };
  matches: BrowseMatchDto[];
}

export interface BrowseMatchesResponseDto {
  success: boolean;
  leagues: BrowseLeagueDto[];
}
