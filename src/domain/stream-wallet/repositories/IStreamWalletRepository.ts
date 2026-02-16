import { Donation } from '../entities/Donation';
import { Subscription } from '../entities/Subscription';

export interface StreamerStats {
  totalDonations: number;
  totalDonationAmount: string;
  totalSubscribers: number;
  activeSubscribers: number;
}

export interface IStreamWalletRepository {
  findDonationsByStreamer(streamerAddress: string): Promise<Donation[]>;
  findDonationsByDonor(donorAddress: string): Promise<Donation[]>;
  findSubscriptionsByStreamer(streamerAddress: string): Promise<Subscription[]>;
  findSubscriptionsBySubscriber(subscriberAddress: string): Promise<Subscription[]>;
  getStreamerStats(streamerAddress: string): Promise<StreamerStats>;
}
