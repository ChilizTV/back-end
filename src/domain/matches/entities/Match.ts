export interface MatchProps {
  id: number;
  apiFootballId: number;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamLogo?: string;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamLogo?: string;
  leagueId: number;
  leagueName: string;
  leagueLogo?: string;
  leagueCountry?: string;
  season: number;
  status: string;
  matchDate: Date;
  venue?: string;
  homeScore?: number;
  awayScore?: number;
  odds?: MatchOdds;
  bettingContractAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchOdds {
  homeWin: number;
  draw: number;
  awayWin: number;
}

export class Match {
  private constructor(private readonly props: MatchProps) {}

  static create(props: Omit<MatchProps, 'createdAt' | 'updatedAt'>): Match {
    const now = new Date();
    return new Match({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: MatchProps): Match {
    return new Match(props);
  }

  isLive(): boolean {
    return ['1H', '2H', 'HT'].includes(this.props.status);
  }

  isUpcoming(): boolean {
    return this.props.status === 'NS' && this.props.matchDate > new Date();
  }

  isFinished(): boolean {
    return this.props.status === 'FT';
  }

  updateScore(homeScore: number, awayScore: number): void {
    this.props.homeScore = homeScore;
    this.props.awayScore = awayScore;
    this.props.updatedAt = new Date();
  }

  updateStatus(status: string): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  getId(): number {
    return this.props.id;
  }

  getLeagueId(): number {
    return this.props.leagueId;
  }

  getStatus(): string {
    return this.props.status;
  }

  getMatchDate(): Date {
    return this.props.matchDate;
  }

  getHomeScore(): number | undefined {
    return this.props.homeScore;
  }

  getAwayScore(): number | undefined {
    return this.props.awayScore;
  }

  getBettingContractAddress(): string | undefined {
    return this.props.bettingContractAddress;
  }

  toJSON(): any {
    return {
      id: this.props.id,
      apiFootballId: this.props.apiFootballId,
      homeTeam: {
        id: this.props.homeTeamId,
        name: this.props.homeTeamName,
        logo: this.props.homeTeamLogo,
      },
      awayTeam: {
        id: this.props.awayTeamId,
        name: this.props.awayTeamName,
        logo: this.props.awayTeamLogo,
      },
      league: {
        id: this.props.leagueId,
        name: this.props.leagueName,
        logo: this.props.leagueLogo,
      },
      season: this.props.season,
      status: this.props.status,
      matchDate: this.props.matchDate,
      venue: this.props.venue,
      score: this.props.homeScore !== undefined && this.props.awayScore !== undefined
        ? { home: this.props.homeScore, away: this.props.awayScore }
        : null,
      odds: this.props.odds,
      bettingContractAddress: this.props.bettingContractAddress,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
