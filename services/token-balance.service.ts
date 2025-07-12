import axios from 'axios';
import { ServiceResult } from './service.result';
import { createPublicClient, http } from 'viem';
import { chiliz } from 'viem/chains';

export interface ChilizToken {
    name: string;
    symbol: string;
    address: string;
}

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

export class TokenBalanceService {
    private readonly FEATURED_THRESHOLD = 50;
    private client: any;

    // Testnet Fan Token addresses from Socios documentation
    private readonly SUPPORTED_TOKENS: ChilizToken[] = [
        {
            name: 'Paris Saint-Germain',
            symbol: 'PSG',
            address: '0x7F73C50748560BD2B286a4c7bF6a805cFb6f735d'
        },
        {
            name: 'Tottenham Hotspur',
            symbol: 'SPURS',
            address: '0x9B9C9AAa74678FcF4E1c76eEB1fa969A8E7254f8' 
        },
        {
            name: 'FC Barcelona',
            symbol: 'BAR',
            address: '0x7F73C50748560BD2B286a4c7bF6a805cFb6f735d' 
        },
        {
            name: 'AC Milan',
            symbol: 'ACM',
            address: '0x641d040dB51398Ba3a4f2d7839532264EcdCc3aE' 
        },
        {
            name: 'OG',
            symbol: 'OG',
            address: '0xEc1C46424E20671d9b21b9336353EeBcC8aEc7b5' 
        },
        {
            name: 'Manchester City',
            symbol: 'CITY',
            address: '0x66F80ddAf5ccfbb082A0B0Fae3F21eA19f6B88ef' 
        },
        {
            name: 'Arsenal',
            symbol: 'AFC',
            address: '0x44B190D30198F2E585De8974999a28f5c68C6E0F' 
        },
        {
            name: 'Flamengo',
            symbol: 'MENGO',
            address: '0x1CC71168281dd78fF004ba6098E113bbbCBDc914' 
        },
        {
            name: 'Juventus',
            symbol: 'JUV',
            address: '0x945EeD98f5CBada87346028aD0BeE0eA66849A0e' 
        },
        {
            name: 'Napoli',
            symbol: 'NAP',
            address: '0x8DBe49c4Dcde110616fafF53b39270E1c48F861a' 
        },
        {
            name: 'Atletico De Madrid',
            symbol: 'ATM',
            address: '0xc926130FA2240e16A41c737d54c1d9b1d4d45257'
        }
    ];

    constructor() {
        this.client = createPublicClient({
            chain: chiliz,
            transport: http('https://spicy-rpc.chiliz.com')
        });
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