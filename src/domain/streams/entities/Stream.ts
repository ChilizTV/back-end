export enum StreamStatus {
  CREATED = 'created',
  LIVE    = 'live',
  ENDED   = 'ended',
}

export interface StreamProps {
  id: string;
  matchId: number;
  streamerId: string;
  streamerName: string;
  streamerWalletAddress?: string;
  streamKey: string;
  hlsUrl?: string;
  title?: string;
  thumbnailUrl?: string;
  status: StreamStatus;
  lastHeartbeatAt?: Date;
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

  /** Transition to LIVE. No-op if already LIVE (idempotent). */
  start(): void {
    if (this.props.status === StreamStatus.LIVE) return;
    this.props.status = StreamStatus.LIVE;
  }

  /** Transition to ENDED. No-op if already ENDED (idempotent). */
  end(): void {
    if (this.props.status === StreamStatus.ENDED) return;
    this.props.status = StreamStatus.ENDED;
    this.props.endedAt = new Date();
  }

  /** Refresh heartbeat timestamp — guarantees lastHeartbeatAt is non-null while LIVE. */
  heartbeat(): void {
    this.props.lastHeartbeatAt = new Date();
  }

  getStatus(): StreamStatus {
    return this.props.status;
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

  getStreamerId(): string {
    return this.props.streamerId;
  }

  /** Backward-compatible helper. Returns true only when status is LIVE. */
  isLive(): boolean {
    return this.props.status === StreamStatus.LIVE;
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
      title: this.props.title,
      status: this.props.status,
      isLive: this.props.status === StreamStatus.LIVE,
      thumbnailUrl: this.props.thumbnailUrl ?? null,
      lastHeartbeatAt: this.props.lastHeartbeatAt,
      viewerCount: this.props.viewerCount,
      endedAt: this.props.endedAt,
      createdAt: this.props.createdAt,
    };
  }
}
