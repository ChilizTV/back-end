export interface DonationProps {
  id: string;
  streamerAddress: string;
  donorAddress: string;
  amount: string;
  message?: string;
  transactionHash: string;
  timestamp: Date;
}

export class Donation {
  private constructor(private readonly props: DonationProps) {}

  static create(props: Omit<DonationProps, 'id'>): Donation {
    return new Donation({
      ...props,
      id: crypto.randomUUID(),
    });
  }

  static reconstitute(props: DonationProps): Donation {
    return new Donation(props);
  }

  toJSON(): any {
    return {
      id: this.props.id,
      streamerAddress: this.props.streamerAddress,
      donorAddress: this.props.donorAddress,
      amount: this.props.amount,
      message: this.props.message,
      transactionHash: this.props.transactionHash,
      timestamp: this.props.timestamp,
    };
  }
}
