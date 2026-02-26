export interface ConnectedUserProps {
  id: string;
  matchId: number;
  userId: string;
  username: string;
  connectedAt: Date;
  lastActivity: Date;
}

export class ConnectedUser {
  private constructor(private props: ConnectedUserProps) {}

  static create(props: Omit<ConnectedUserProps, 'id' | 'connectedAt' | 'lastActivity'>): ConnectedUser {
    const now = new Date();
    return new ConnectedUser({
      ...props,
      id: crypto.randomUUID(),
      connectedAt: now,
      lastActivity: now,
    });
  }

  static reconstitute(props: ConnectedUserProps): ConnectedUser {
    return new ConnectedUser(props);
  }

  updateActivity(): void {
    this.props.lastActivity = new Date();
  }

  getId(): string {
    return this.props.id;
  }

  getMatchId(): number {
    return this.props.matchId;
  }

  getUserId(): string {
    return this.props.userId;
  }

  toJSON(): any {
    return {
      id: this.props.id,
      matchId: this.props.matchId,
      userId: this.props.userId,
      username: this.props.username,
      connectedAt: this.props.connectedAt.getTime(),
      lastActivity: this.props.lastActivity.getTime(),
    };
  }
}
