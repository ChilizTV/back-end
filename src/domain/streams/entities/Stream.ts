export interface StreamProps {
  id: string;
  matchId: number;
  streamerId: string;
  streamerName: string;
  streamKey: string;
  hlsUrl?: string;
  thumbnailUrl?: string;
  isLive: boolean;
  viewerCount: number;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Stream {
  private constructor(private props: StreamProps) {}

  static create(props: Omit<StreamProps, 'id' | 'createdAt' | 'updatedAt' | 'startedAt'>): Stream {
    const now = new Date();
    return new Stream({
      ...props,
      id: crypto.randomUUID(),
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: StreamProps): Stream {
    return new Stream(props);
  }

  end(): void {
    this.props.isLive = false;
    this.props.endedAt = new Date();
    this.props.updatedAt = new Date();
  }

  updateViewerCount(count: number): void {
    this.props.viewerCount = count;
    this.props.updatedAt = new Date();
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
      streamKey: this.props.streamKey,
      hlsUrl: this.props.hlsUrl,
      thumbnailUrl: this.props.thumbnailUrl,
      isLive: this.props.isLive,
      viewerCount: this.props.viewerCount,
      startedAt: this.props.startedAt,
      endedAt: this.props.endedAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
