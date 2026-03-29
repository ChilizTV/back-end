export enum MessageType {
  REGULAR = 'REGULAR',
  BET = 'BET',
  SYSTEM = 'SYSTEM',
  DONATION = 'DONATION',
}

export interface ChatMessageProps {
  id: string;
  matchId: number;
  streamId?: string;
  userId: string;
  walletAddress: string;
  username: string;
  message: string;
  timestamp: Date;
  type: MessageType;
  isFeatured: boolean;
  betType?: string;
  betSubType?: string;
  amount?: number;
  odds?: number;
}

export class ChatMessage {
  private constructor(private readonly props: ChatMessageProps) {}

  static create(props: Omit<ChatMessageProps, 'id' | 'timestamp'>): ChatMessage {
    return new ChatMessage({
      ...props,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    });
  }

  static reconstitute(props: ChatMessageProps): ChatMessage {
    return new ChatMessage(props);
  }

  getId(): string {
    return this.props.id;
  }

  getMatchId(): number {
    return this.props.matchId;
  }

  getStreamId(): string | undefined {
    return this.props.streamId;
  }

  getUserId(): string {
    return this.props.userId;
  }

  isBetMessage(): boolean {
    return this.props.type === MessageType.BET;
  }

  toJSON(): any {
    return {
      id: this.props.id,
      matchId: this.props.matchId,
      streamId: this.props.streamId ?? null,
      userId: this.props.userId,
      walletAddress: this.props.walletAddress,
      username: this.props.username,
      message: this.props.message,
      timestamp: this.props.timestamp.getTime(),
      type: this.props.type,
      isFeatured: this.props.isFeatured,
      ...(this.props.betType && { betType: this.props.betType }),
      ...(this.props.betSubType && { betSubType: this.props.betSubType }),
      ...(this.props.amount && { amount: this.props.amount }),
      ...(this.props.odds && { odds: this.props.odds }),
    };
  }
}
