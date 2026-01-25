import { createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { chiliz } from 'viem/chains';
import { chilizConfig, networkType } from '../config/chiliz.config';

const FACTORY_ADDRESS = (process.env.BETTING_MATCH_FACTORY_ADDRESS || 
    '0x9b94425D6c877B479a5943e82c3bA6e6C6Ec4462') as `0x${string}`;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY as `0x${string}`;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS as `0x${string}`;

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

// ABI minimal de BettingMatchFactory pour les fonctions nécessaires
const FACTORY_ABI = [
    {
        "type": "function",
        "name": "createFootballMatch",
        "inputs": [
            { "name": "_matchName", "type": "string" },
            { "name": "_owner", "type": "address" }
        ],
        "outputs": [
            { "name": "proxy", "type": "address" }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "MatchCreated",
        "inputs": [
            { "name": "proxy", "type": "address", "indexed": true },
            { "name": "sportType", "type": "uint8", "indexed": false },
            { "name": "owner", "type": "address", "indexed": true }
        ]
    }
] as const;

export class BettingMatchDeploymentService {
    private walletClient;
    
    constructor() {
        if (!ADMIN_PRIVATE_KEY) {
            throw new Error('ADMIN_PRIVATE_KEY environment variable is required');
        }
        
        // Use testnet (spicy) or mainnet (chiliz) based on environment
        const chain = networkType === 'testnet' ? spicy : chiliz;
        const account = privateKeyToAccount(ADMIN_PRIVATE_KEY);
        
        this.walletClient = createWalletClient({
            account,
            chain,
            transport: http(chilizConfig.rpcUrl)
        });
        
        console.log(`🔧 BettingMatchDeploymentService initialized on ${networkType} (${chain.name})`);
        console.log(`   Factory Address: ${FACTORY_ADDRESS}`);
        console.log(`   Admin Address: ${account.address}`);
    }
    
    /**
     * Deploy a new FootballMatch contract via the Factory
     * @param matchName Name of the match (e.g., "PSG vs Barcelona")
     * @param ownerAddress Address that will own the match contract (usually admin)
     * @returns Address of the deployed match proxy
     */
    async deployFootballMatch(matchName: string, ownerAddress: string): Promise<string> {
        try {
            console.log(`🎯 Deploying FootballMatch contract for: ${matchName}`);
            console.log(`   Owner: ${ownerAddress}`);
            
            // Call createFootballMatch on the Factory
            const hash = await this.walletClient.writeContract({
                address: FACTORY_ADDRESS,
                abi: FACTORY_ABI,
                functionName: 'createFootballMatch',
                args: [matchName, ownerAddress as `0x${string}`],
            });
            
            console.log(`📝 Transaction sent: ${hash}`);
            
            // Wait for transaction receipt
            const publicClient = this.walletClient;
            let receipt;
            let attempts = 0;
            const maxAttempts = 60; // 60 secondes max
            
            while (attempts < maxAttempts) {
                try {
                    // @ts-ignore - getTransactionReceipt existe sur le walletClient
                    receipt = await publicClient.getTransactionReceipt({ hash });
                    if (receipt) break;
                } catch (e) {
                    // Transaction pas encore minée
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }
            
            if (!receipt) {
                throw new Error('Transaction receipt not found after 60 seconds');
            }
            
            // Extract the proxy address from the MatchCreated event
            const matchCreatedEvent = receipt.logs.find((log: any) => 
                log.topics[0] === '0x5969a2068f5fa459c1b0f8d90549ffd48273691f337cf3200090f8c4ded08d16' // MatchCreated event signature
            );
            
            if (!matchCreatedEvent || !matchCreatedEvent.topics[1]) {
                throw new Error('MatchCreated event not found in transaction logs');
            }
            
            // The proxy address is in the first indexed parameter (topics[1])
            const proxyAddress = `0x${matchCreatedEvent.topics[1].slice(26)}` as `0x${string}`;
            
            console.log(`✅ FootballMatch contract deployed at: ${proxyAddress}`);
            console.log(`   Transaction: ${hash}`);
            
            return proxyAddress;
        } catch (error) {
            console.error('❌ Error deploying FootballMatch contract:', error);
            throw error;
        }
    }
    
    /**
     * Get the admin address being used
     */
    getAdminAddress(): string {
        return ADMIN_ADDRESS || this.walletClient.account.address;
    }
}

// Export singleton instance
export const bettingDeploymentService = new BettingMatchDeploymentService();
