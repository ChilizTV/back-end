import axios from 'axios';
import { ServiceResult } from './service.result';
import { createPublicClient, http, defineChain } from 'viem';
import { chiliz } from 'viem/chains';
import { chilizConfig, ChilizToken, networkType } from '../config/chiliz.config';

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

// Define Spicy testnet chain for viem
const spicy = defineChain({
    id: 88882,
    name: 'Chiliz Spicy Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'CHZ',
        symbol: 'CHZ',
    },
    rpcUrls: {
        default: {
            http: ['https://spicy-rpc.chiliz.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Spicy Explorer',
            url: 'https://testnet.chiliscan.com',
        },
    },
    testnet: true,
});

export class TokenBalanceService {
    private readonly FEATURED_THRESHOLD = 50;
    private client: any;
    private readonly SUPPORTED_TOKENS: ChilizToken[];

    constructor() {
        this.SUPPORTED_TOKENS = chilizConfig.tokens;
        
        // Use testnet (spicy) or mainnet (chiliz) based on environment
        const chain = networkType === 'testnet' ? spicy : chiliz;
        
        this.client = createPublicClient({
            chain,
            transport: http(chilizConfig.rpcUrl)
        });
        
        console.log(`🔧 TokenBalanceService initialized with ${this.SUPPORTED_TOKENS.length} tokens on ${networkType} (${chain.name}) - ${chilizConfig.rpcUrl}`);
    }

    private async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<number> {
        try {
            console.log(`🔍 Calling balanceOf for token ${tokenAddress} with wallet ${walletAddress}`);
            
            const balance = await this.client.readContract({
                address: tokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [walletAddress as `0x${string}`],
            });

            const balanceNumber = Number(balance);
            console.log(`✅ Balance for ${tokenAddress}: ${balanceNumber} (raw: ${balance})`);
            return balanceNumber;
        } catch (error) {
            console.error(`❌ Error fetching balance for token ${tokenAddress}:`, error);
            return 0;
        }
    }

    async getUserTokenBalances(walletAddress: string): Promise<ServiceResult<UserTokenBalance>> {
        try {
            console.log(`💰 Fetching token balances for wallet: ${walletAddress}`);
            
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
                
                console.log(`📊 ${token.symbol}: ${balance} tokens`);
            }

            const isFeatured = totalBalance >= this.FEATURED_THRESHOLD;

            const userBalance: UserTokenBalance = {
                walletAddress,
                totalBalance,
                tokenBalances,
                isFeatured
            };

            console.log(`✅ Total balance: ${totalBalance} tokens, Featured: ${isFeatured}`);
            
            return ServiceResult.success(userBalance);
        } catch (error) {
            console.error('❌ Error fetching user token balances:', error);
            return ServiceResult.failed();
        }
    }

    async isUserFeatured(walletAddress: string): Promise<ServiceResult<boolean>> {
        try {
            const result = await this.getUserTokenBalances(walletAddress);
            
            if (result.errorCode === 0) {
                return ServiceResult.success(result.result!.isFeatured);
            }
            
            return ServiceResult.failed();
        } catch (error) {
            console.error('❌ Error checking if user is featured:', error);
            return ServiceResult.failed();
        }
    }

    getSupportedTokens(): ChilizToken[] {
        return [...this.SUPPORTED_TOKENS];
    }

    getFeaturedThreshold(): number {
        return this.FEATURED_THRESHOLD;
    }
} 