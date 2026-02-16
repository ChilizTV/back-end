export interface WaitlistEntryProps {
  id: string;
  email: string;
  walletAddress?: string;
  source?: string;
  hasAccess: boolean;
  createdAt: Date;
}

export class WaitlistEntry {
  private constructor(private readonly props: WaitlistEntryProps) {}

  static create(props: Omit<WaitlistEntryProps, 'id' | 'createdAt'>): WaitlistEntry {
    return new WaitlistEntry({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    });
  }

  static reconstitute(props: WaitlistEntryProps): WaitlistEntry {
    return new WaitlistEntry(props);
  }

  getId(): string {
    return this.props.id;
  }

  getEmail(): string {
    return this.props.email;
  }

  getWalletAddress(): string | undefined {
    return this.props.walletAddress;
  }

  hasAccess(): boolean {
    return this.props.hasAccess;
  }

  toJSON(): any {
    return {
      id: this.props.id,
      email: this.props.email,
      walletAddress: this.props.walletAddress,
      source: this.props.source,
      hasAccess: this.props.hasAccess,
      createdAt: this.props.createdAt,
    };
  }
}
