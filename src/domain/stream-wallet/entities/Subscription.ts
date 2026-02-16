export interface SubscriptionProps {
  id: string;
  streamerAddress: string;
  subscriberAddress: string;
  tier: number;
  amount: string;
  startDate: Date;
  endDate: Date;
  transactionHash: string;
}

export class Subscription {
  private constructor(private readonly props: SubscriptionProps) {}

  static create(props: Omit<SubscriptionProps, 'id'>): Subscription {
    return new Subscription({
      ...props,
      id: crypto.randomUUID(),
    });
  }

  static reconstitute(props: SubscriptionProps): Subscription {
    return new Subscription(props);
  }

  isActive(): boolean {
    const now = new Date();
    return this.props.startDate <= now && now <= this.props.endDate;
  }

  toJSON(): any {
    return {
      id: this.props.id,
      streamerAddress: this.props.streamerAddress,
      subscriberAddress: this.props.subscriberAddress,
      tier: this.props.tier,
      amount: this.props.amount,
      startDate: this.props.startDate,
      endDate: this.props.endDate,
      transactionHash: this.props.transactionHash,
      isActive: this.isActive(),
    };
  }
}
