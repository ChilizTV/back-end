import { WaitlistEntry } from '../entities/WaitlistEntry';

export interface WaitlistStats {
  totalEntries: number;
  withAccess: number;
  withoutAccess: number;
}

export interface IWaitlistRepository {
  save(entry: WaitlistEntry): Promise<WaitlistEntry>;
  findByEmail(email: string): Promise<WaitlistEntry | null>;
  findByWalletAddress(walletAddress: string): Promise<WaitlistEntry | null>;
  getStats(): Promise<WaitlistStats>;
}
