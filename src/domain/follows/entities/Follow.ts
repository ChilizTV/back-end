export interface FollowProps {
  id: string;
  followerId: string;
  streamerId: string;
  streamerName: string;
  createdAt: Date;
}

export class Follow {
  private constructor(private props: FollowProps) {}

  static create(props: Omit<FollowProps, 'id' | 'createdAt'>): Follow {
    return new Follow({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    });
  }

  static reconstitute(props: FollowProps): Follow {
    return new Follow(props);
  }

  getId(): string {
    return this.props.id;
  }

  toJSON(): FollowProps {
    return { ...this.props };
  }
}
