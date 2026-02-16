import { injectable } from 'tsyringe';
import { createPublicClient, http } from 'viem';
import { chiliz } from 'viem/chains';
import { chilizConfig, ChilizToken, networkType } from '../../config/chiliz.config';
import { baseSepolia } from '../chains';
import { logger } from '../../logging/logger';

export interface TokenBalance {
    token: ChilizToken;
    balance: number;
}

export interface UserTokenBalance {
    walletAddress: string;
    totalBalance: number;
    tokenBalances: TokenBalance[];
    isFeatured: boolean;
}

// Standard ERC-20 ABI for balanceOf function
const ERC20_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
] as const;

@injectable()
export class TokenBalanceAdapter {
    private readonly FEATURED_THRESHOLD = 50;
    private client: any;
    private readonly SUPPORTED_TOKENS: ChilizToken[];

    constructor() {
        this.SUPPORTED_TOKENS = chilizConfig.tokens;

        // Use testnet (baseSepolia) or mainnet (chiliz) based on environment
        const chain = networkType === 'testnet' ? baseSepolia : chiliz;

        this.client = createPublicClient({
            chain,
            transport: http(chilizConfig.rpcUrl)
        });

        logger.info('TokenBalanceAdapter initialized', {
            tokenCount: this.SUPPORTED_TOKENS.length,
            network: networkType,
            chain: chain.name,
            rpcUrl: chilizConfig.rpcUrl
        });
    }

    private async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<number> {
        try {
            logger.debug('Fetching token balance', { walletAddress, tokenAddress });

            const balance = await this.client.readContract({
                address: tokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [walletAddress as `0x${string}`],
            });

            const balanceNumber = Number(balance);
            logger.debug('Token balance fetched', { tokenAddress, balance: balanceNumber });
            return balanceNumber;
        } catch (error) {
            logger.error('Error fetching token balance', {
                error: error instanceof Error ? error.message : 'Unknown error',
                tokenAddress,
                walletAddress
            });
            return 0;
        }
    }

    async getUserTokenBalances(walletAddress: string): Promise<UserTokenBalance> {
        logger.info('Fetching user token balances', { walletAddress });

        const tokenBalances: TokenBalance[] = [];
        let totalBalance = 0;

        for (const token of this.SUPPORTED_TOKENS) {
            const balance = await this.getTokenBalance(walletAddress, token.address);

            tokenBalances.push({
                token,
                balance
            });

            if (balance > 0) {
                totalBalance += balance;
            }

            logger.debug('Token balance processed', {
                symbol: token.symbol,
                balance
            });
        }

        const isFeatured = totalBalance >= this.FEATURED_THRESHOLD;

        const userBalance: UserTokenBalance = {
            walletAddress,
            totalBalance,
            tokenBalances,
            isFeatured
        };

        logger.info('User token balances calculated', {
            walletAddress,
            totalBalance,
            isFeatured
        });

        return userBalance;
    }

    async isUserFeatured(walletAddress: string): Promise<boolean> {
        const result = await this.getUserTokenBalances(walletAddress);
        return result.isFeatured;
    }

    getSupportedTokens(): ChilizToken[] {
        return [...this.SUPPORTED_TOKENS];
    }

    getFeaturedThreshold(): number {
        return this.FEATURED_THRESHOLD;
    }
}
