import { injectable } from 'tsyringe';
import { supabaseClient as supabase } from '../../database/supabase/client';
import { Donation } from '../../../domain/stream-wallet/entities/Donation';
import { Subscription } from '../../../domain/stream-wallet/entities/Subscription';
import { IStreamWalletRepository, StreamerStats } from '../../../domain/stream-wallet/repositories/IStreamWalletRepository';
import { logger } from '../../logging/logger';

interface DonationRow {
  id: string;
  streamer_address: string;
  donor_address: string;
  amount: string;
  message?: string;
  transaction_hash: string;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  streamer_address: string;
  subscriber_address: string;
  duration_seconds: number;
  amount: string;
  start_time: string;
  expiry_time: string;
  transaction_hash: string;
}

@injectable()
export class SupabaseStreamWalletRepository implements IStreamWalletRepository {
  async findDonationsByStreamer(streamerAddress: string): Promise<Donation[]> {
    const { data: rows, error } = await supabase
      .from('donations')
      .select('*')
      .eq('streamer_address', streamerAddress.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to find donations by streamer', { error: error.message, streamerAddress });
      throw new Error('Failed to find donations');
    }

    return rows ? rows.map(row => this.donationToDomain(row)) : [];
  }

  async findDonationsByDonor(donorAddress: string): Promise<Donation[]> {
    const { data: rows, error } = await supabase
      .from('donations')
      .select('*')
      .eq('donor_address', donorAddress.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to find donations by donor', { error: error.message, donorAddress });
      throw new Error('Failed to find donations');
    }

    return rows ? rows.map(row => this.donationToDomain(row)) : [];
  }

  async findSubscriptionsByStreamer(streamerAddress: string): Promise<Subscription[]> {
    const { data: rows, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('streamer_address', streamerAddress.toLowerCase())
      .order('start_time', { ascending: false });

    if (error) {
      logger.error('Failed to find subscriptions by streamer', { error: error.message, streamerAddress });
      throw new Error('Failed to find subscriptions');
    }

    return rows ? rows.map(row => this.subscriptionToDomain(row)) : [];
  }

  async findSubscriptionsBySubscriber(subscriberAddress: string): Promise<Subscription[]> {
    const { data: rows, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('subscriber_address', subscriberAddress.toLowerCase())
      .order('start_time', { ascending: false });

    if (error) {
      logger.error('Failed to find subscriptions by subscriber', { error: error.message, subscriberAddress });
      throw new Error('Failed to find subscriptions');
    }

    return rows ? rows.map(row => this.subscriptionToDomain(row)) : [];
  }

  async getStreamerStats(streamerAddress: string): Promise<StreamerStats> {
    const [donations, subscriptions] = await Promise.all([
      this.findDonationsByStreamer(streamerAddress),
      this.findSubscriptionsByStreamer(streamerAddress),
    ]);

    const totalDonations = donations.length;
    const totalDonationAmount = donations.reduce((sum, d) => {
      return sum + parseFloat(d.toJSON().amount);
    }, 0).toString();

    const totalSubscribers = subscriptions.length;
    const activeSubscribers = subscriptions.filter(s => s.isActive()).length;

    return {
      totalDonations,
      totalDonationAmount,
      totalSubscribers,
      activeSubscribers,
    };
  }

  private donationToDomain(row: DonationRow): Donation {
    return Donation.reconstitute({
      id: row.id,
      streamerAddress: row.streamer_address,
      donorAddress: row.donor_address,
      amount: row.amount,
      message: row.message,
      transactionHash: row.transaction_hash,
      timestamp: new Date(row.created_at),
    });
  }

  private subscriptionToDomain(row: SubscriptionRow): Subscription {
    return Subscription.reconstitute({
      id: row.id,
      streamerAddress: row.streamer_address,
      subscriberAddress: row.subscriber_address,
      durationSeconds: row.duration_seconds,
      amount: row.amount,
      startDate: new Date(row.start_time),
      endDate: new Date(row.expiry_time),
      transactionHash: row.transaction_hash,
    });
  }
}
