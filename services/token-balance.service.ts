import axios from 'axios';
import { ServiceResult } from './service.result';

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

export class TokenBalanceService {
    private readonly CHILIZ_RPC_URL = 'https://spicy-rpc.chiliz.com';
    private readonly FEATURED_THRESHOLD = 50;

    private readonly SUPPORTED_TOKENS: ChilizToken[] = [
        {
            name: 'Paris Saint-Germain',
            symbol: 'PSG',
            address: '0xb0Fa395a3386800658B9617F90e834E2CeC76Dd3'
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

    private async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<number> {
        try {
            const balanceOfAbi = {
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            };

            const data = this.encodeFunctionCall(balanceOfAbi, [walletAddress]);

            const response = await axios.post(this.CHILIZ_RPC_URL, {
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                    to: tokenAddress,
                    data: data
                }, 'latest'],
                id: 1
            });

            if (response.data.result) {
                const balance = parseInt(response.data.result, 16);
                return balance;
            }

            return 0;
        } catch (error) {
            console.error(`❌ Error fetching balance for token ${tokenAddress}:`, error);
            return 0;
        }
    }

    private encodeFunctionCall(abi: any, params: any[]): string {
        const functionSignature = `${abi.name}(${abi.inputs.map((input: any) => input.type).join(',')})`;

        const functionSelector = this.keccak256(functionSignature).substring(0, 10);

        const encodedParams = this.encodeParameters(abi.inputs, params);
        
        return functionSelector + encodedParams;
    }

    private keccak256(input: string): string {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return '0x' + Math.abs(hash).toString(16).padStart(8, '0');
    }

    private encodeParameters(inputs: any[], params: any[]): string {
        let encoded = '';
        
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const param = params[i];
            
            if (input.type === 'address') {
                const address = param.replace('0x', '').toLowerCase();
                encoded += address.padStart(64, '0');
            } else if (input.type === 'uint256') {
                const number = param.toString(16);
                encoded += number.padStart(64, '0');
            }
        }
        
        return encoded;
    }

    async getUserTokenBalances(walletAddress: string): Promise<ServiceResult<UserTokenBalance>> {
        try {
            console.log(`💰 Fetching token balances for wallet: ${walletAddress}`);
            
            const tokenBalances: TokenBalance[] = [];
            let totalBalance = 0;

            for (const token of this.SUPPORTED_TOKENS) {
                const balance = await this.getTokenBalance(walletAddress, token.address);
                
                if (balance > 0) {
                    tokenBalances.push({
                        token,
                        balance
                    });
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