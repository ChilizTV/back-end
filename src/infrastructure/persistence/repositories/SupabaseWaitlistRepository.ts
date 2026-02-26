import { injectable } from 'tsyringe';
import { supabaseClient as supabase } from '../../database/supabase/client';
import { WaitlistEntry } from '../../../domain/waitlist/entities/WaitlistEntry';
import { IWaitlistRepository, WaitlistStats } from '../../../domain/waitlist/repositories/IWaitlistRepository';
import { logger } from '../../logging/logger';

interface WaitlistRow {
  id: string;
  email: string;
  wallet_address?: string;
  source?: string;
  has_access: boolean;
  created_at: string;
}

@injectable()
export class SupabaseWaitlistRepository implements IWaitlistRepository {
  async save(entry: WaitlistEntry): Promise<WaitlistEntry> {
    const row = this.toRow(entry);

    const { data, error } = await supabase
      .from('waitlist')
      .insert(row)
      .select()
      .single();

    if (error) {
      logger.error('Failed to save waitlist entry', { error: error.message });
      throw new Error('Failed to save waitlist entry');
    }

    return this.toDomain(data);
  }

  async findByEmail(email: string): Promise<WaitlistEntry | null> {
    const { data: row, error } = await supabase
      .from('waitlist')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      logger.error('Failed to find entry by email', { error: error.message, email });
      throw new Error('Failed to find waitlist entry');
    }

    return row ? this.toDomain(row) : null;
  }

  async findByWalletAddress(walletAddress: string): Promise<WaitlistEntry | null> {
    const { data: row, error } = await supabase
      .from('waitlist')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle();

    if (error) {
      logger.error('Failed to find entry by wallet', { error: error.message, walletAddress });
      throw new Error('Failed to find waitlist entry');
    }

    return row ? this.toDomain(row) : null;
  }

  async getStats(): Promise<WaitlistStats> {
    const { data: entries, error } = await supabase
      .from('waitlist')
      .select('has_access');

    if (error) {
      logger.error('Failed to get waitlist stats', { error: error.message });
      throw new Error('Failed to get stats');
    }

    const totalEntries = entries?.length || 0;
    const withAccess = entries?.filter(e => e.has_access).length || 0;
    const withoutAccess = totalEntries - withAccess;

    return {
      totalEntries,
      withAccess,
      withoutAccess,
    };
  }

  private toDomain(row: WaitlistRow): WaitlistEntry {
    return WaitlistEntry.reconstitute({
      id: row.id,
      email: row.email,
      walletAddress: row.wallet_address,
      source: row.source,
      hasAccess: row.has_access,
      createdAt: new Date(row.created_at),
    });
  }

  private toRow(entry: WaitlistEntry): any {
    const json = entry.toJSON();
    return {
      id: json.id,
      email: json.email.toLowerCase(),
      wallet_address: json.walletAddress?.toLowerCase(),
      source: json.source,
      has_access: json.hasAccess,
      created_at: json.createdAt.toISOString(),
    };
  }
}
