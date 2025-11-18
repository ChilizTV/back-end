import { supabase } from '../config/supabase';
import { ServiceResult, ServiceErrorCode } from './service.result';
import { CreateWaitlistRequest, WaitlistEntry } from '../models/waitlist.model';

export class WaitlistService {
    private mapEntry(record: any): WaitlistEntry {
        return {
            id: record.id,
            email: record.email,
            walletAddress: record.wallet_address || undefined,
            source: record.source || undefined,
            isWhitelisted: Boolean(record.is_whitelisted),
            registeredAt: new Date(record.registered_at),
            whitelistedAt: record.whitelisted_at ? new Date(record.whitelisted_at) : undefined,
            createdAt: new Date(record.created_at),
            updatedAt: new Date(record.updated_at)
        };
    }

    async addToWaitlist(data: CreateWaitlistRequest): Promise<ServiceResult<WaitlistEntry>> {
        try {
            const { data: existing } = await supabase
                .from('waitlist')
                .select('*')
                .eq('email', data.email.toLowerCase())
                .limit(1)
                .single();

            if (existing) {
                return ServiceResult.success(this.mapEntry(existing));
            }

            const insertPayload = {
                email: data.email.toLowerCase(),
                wallet_address: data.walletAddress,
                source: data.source,
            };

            const { data: inserted, error } = await supabase
                .from('waitlist')
                .insert(insertPayload)
                .select('*')
                .single();

            if (error || !inserted) {
                return ServiceResult.failed();
            }

            return ServiceResult.success(this.mapEntry(inserted));
        } catch (error) {
            console.error('❌ Error adding to waitlist:', error);
            return ServiceResult.failed();
        }
    }

    async checkAccess(params: { email?: string; walletAddress?: string; }): Promise<ServiceResult<{ hasAccess: boolean; entry?: WaitlistEntry }>> {
        try {
            const { email, walletAddress } = params;

            if (!email && !walletAddress) {
                return new ServiceResult<{ hasAccess: boolean; entry?: WaitlistEntry }>(undefined, ServiceErrorCode.invalidParameter);
            }

            let query = supabase.from('waitlist').select('*').eq('is_whitelisted', true);

            if (email) {
                query = query.eq('email', email.toLowerCase());
            } else if (walletAddress) {
                query = query.eq('wallet_address', walletAddress);
            }

            const { data, error } = await query.limit(1).maybeSingle();

            if (error) {
                return ServiceResult.failed();
            }

            if (!data) {
                return ServiceResult.success({ hasAccess: false });
            }

            return ServiceResult.success({
                hasAccess: true,
                entry: this.mapEntry(data)
            });
        } catch (error) {
            console.error('❌ Error checking waitlist access:', error);
            return ServiceResult.failed();
        }
    }

    async getStats(): Promise<ServiceResult<{ total: number; whitelisted: number }>> {
        try {
            const { count: total } = await supabase
                .from('waitlist')
                .select('*', { count: 'exact', head: true });

            const { count: whitelisted } = await supabase
                .from('waitlist')
                .select('*', { count: 'exact', head: true })
                .eq('is_whitelisted', true);

            return ServiceResult.success({
                total: total || 0,
                whitelisted: whitelisted || 0
            });
        } catch (error) {
            console.error('❌ Error fetching waitlist stats:', error);
            return ServiceResult.failed();
        }
    }
}

export const waitlistService = new WaitlistService();

