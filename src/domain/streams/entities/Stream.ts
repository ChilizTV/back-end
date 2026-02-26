export interface StreamProps {
  id: string;
  matchId: number;
  streamerId: string;
  streamerName: string;
  streamerWalletAddress?: string;
  streamKey: string;
  hlsUrl?: string;
  isLive: boolean;
  viewerCount: number;
  endedAt?: Date;
  createdAt: Date;
}

export class Stream {
  private constructor(private props: StreamProps) {}

  static create(props: Omit<StreamProps, 'id' | 'createdAt'>): Stream {
    const now = new Date();
    return new Stream({
      ...props,
      id: crypto.randomUUID(),
      createdAt: now,
    });
  }

  static reconstitute(props: StreamProps): Stream {
    return new Stream(props);
  }

  end(): void {
    this.props.isLive = false;
    this.props.endedAt = new Date();
  }

  updateViewerCount(count: number): void {
    this.props.viewerCount = count;
  }

  getId(): string {
    return this.props.id;
  }

  getStreamKey(): string {
    return this.props.streamKey;
  }

  isLive(): boolean {
    return this.props.isLive;
  }

  toJSON(): any {
    return {
      id: this.props.id,
      matchId: this.props.matchId,
      streamerId: this.props.streamerId,
      streamerName: this.props.streamerName,
      streamerWalletAddress: this.props.streamerWalletAddress,
      streamKey: this.props.streamKey,
      hlsUrl: this.props.hlsUrl,
      isLive: this.props.isLive,
      viewerCount: this.props.viewerCount,
      endedAt: this.props.endedAt,
      createdAt: this.props.createdAt,
    };
  }
}
