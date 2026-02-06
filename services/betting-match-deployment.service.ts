import { createWalletClient, createPublicClient, http, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { chiliz } from 'viem/chains';
import { chilizConfig, networkType } from '../config/chiliz.config';
import { FACTORY_ABI, FOOTBALL_MATCH_ABI } from '../utils/abis';
import { baseSepolia } from '../utils/chains';

const FACTORY_ADDRESS = (process.env.BETTING_MATCH_FACTORY_ADDRESS || 
    '0x9b94425D6c877B479a5943e82c3bA6e6C6Ec4462') as `0x${string}`;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY as `0x${string}`;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS as `0x${string}`;

// MarketState enum: Inactive=0, Open=1, Suspended=2, Closed=3, Resolved=4, Cancelled=5
const MarketState = { Inactive: 0, Open: 1, Suspended: 2, Closed: 3, Resolved: 4, Cancelled: 5 } as const;

// Market type hashes (keccak256, matches FootballMatch.sol)
const MARKET_WINNER = keccak256(toBytes('WINNER'));
const MARKET_GOALS_TOTAL = keccak256(toBytes('GOALS_TOTAL'));
const MARKET_BOTH_SCORE = keccak256(toBytes('BOTH_SCORE'));

// Convert odds: decimal (2.20) -> x10000 (22000)
function toOddsX10000(decimal: number): number {
    return Math.round(decimal * 10000);
}

// Delay between transactions to avoid "replacement transaction underpriced"
const TX_DELAY_MS = 4000;
function delay(ms: number = TX_DELAY_MS) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export interface MarketSetupOdds {
    homeWin?: number;
    draw?: number;
    awayWin?: number;
    over25?: number;
    under25?: number;
    bttsYes?: number;
    bttsNo?: number;
}

export class BettingMatchDeploymentService {
    private walletClient;
    private publicClient;
    
    constructor() {
        if (!ADMIN_PRIVATE_KEY) {
            throw new Error('ADMIN_PRIVATE_KEY environment variable is required');
        }
        
        // Use testnet (baseSepolia) or mainnet (chiliz) based on environment
        const chain = networkType === 'testnet' ? baseSepolia : chiliz;
        const account = privateKeyToAccount(ADMIN_PRIVATE_KEY);
        
        this.walletClient = createWalletClient({
            account,
            chain,
            transport: http(chilizConfig.rpcUrl)
        });
        
        this.publicClient = createPublicClient({
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
            
            // Wait for transaction receipt via PublicClient (walletClient doesn't have getTransactionReceipt)
            const receipt = await this.publicClient.waitForTransactionReceipt({
                hash,
                timeout: 120_000, // 2 minutes (Base Sepolia can be slow)
            });
            
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
     * Configure betting markets on an existing FootballMatch contract.
     * Adds at least WINNER (1X2) market and opens it for betting.
     * @param contractAddress FootballMatch contract address
     * @param odds Optional odds (decimal: 2.20, 3.30, etc.). Default: 2.20, 3.30, 2.80
     */
    async setupDefaultMarkets(
        contractAddress: string,
        odds?: MarketSetupOdds
    ): Promise<void> {
        const matchAddr = contractAddress as `0x${string}`;

        // Default odds (x10000) - initialOdds = first selection odds for each market
        const oddsHome = odds?.homeWin ? toOddsX10000(odds.homeWin) : 22000;
        const oddsOver25 = odds?.over25 ? toOddsX10000(odds.over25) : 18500;
        const oddsBttsYes = odds?.bttsYes ? toOddsX10000(odds.bttsYes) : 17000;

        let hash: `0x${string}`;

        const sendAndWait = async (fn: () => Promise<`0x${string}`>) => {
            hash = await fn();
            await this.publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
            await delay(); // Avoid "replacement transaction underpriced"
        };

        console.log('   📊 Adding WINNER market (1X2)...');
        await sendAndWait(() => this.walletClient.writeContract({
            address: matchAddr,
            abi: FOOTBALL_MATCH_ABI,
            functionName: 'addMarket',
            args: [MARKET_WINNER, oddsHome],
        }));

        console.log('   📊 Adding GOALS_TOTAL market (Over/Under 2.5)...');
        await sendAndWait(() => this.walletClient.writeContract({
            address: matchAddr,
            abi: FOOTBALL_MATCH_ABI,
            functionName: 'addMarketWithLine',
            args: [MARKET_GOALS_TOTAL, oddsOver25, 25],
        }));

        console.log('   📊 Adding BOTH_SCORE market (BTTS)...');
        await sendAndWait(() => this.walletClient.writeContract({
            address: matchAddr,
            abi: FOOTBALL_MATCH_ABI,
            functionName: 'addMarket',
            args: [MARKET_BOTH_SCORE, oddsBttsYes],
        }));

        console.log('   🔓 Opening markets...');
        for (let marketId = 0; marketId < 3; marketId++) {
            await sendAndWait(() => this.walletClient.writeContract({
                address: matchAddr,
                abi: FOOTBALL_MATCH_ABI,
                functionName: 'openMarket',
                args: [BigInt(marketId)],
            }));
        }
        console.log('   ✅ 3 markets created and opened (WINNER, GOALS_TOTAL, BOTH_SCORE)');
    }
    
    /**
     * Get the number of markets on a FootballMatch contract
     */
    async getMarketCount(contractAddress: string): Promise<number> {
        const result = await this.publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: FOOTBALL_MATCH_ABI,
            functionName: 'marketCount',
        });
        return Number(result);
    }

    /**
     * Get the state of a market (0=Inactive, 1=Open, 2=Suspended, 3=Closed, 4=Resolved, 5=Cancelled)
     */
    async getMarketState(contractAddress: string, marketId: number): Promise<number> {
        const core = await this.publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: FOOTBALL_MATCH_ABI,
            functionName: 'getMarketCore',
            args: [BigInt(marketId)],
        }) as readonly [number, bigint, number, number, bigint];
        return core[0]; // state is first element
    }

    /**
     * Open all markets that are currently Inactive.
     * Call this when a contract has markets but they were never opened (e.g. partial setup).
     */
    async openInactiveMarkets(contractAddress: string): Promise<number> {
        const count = await this.getMarketCount(contractAddress);
        if (count === 0) return 0;

        const matchAddr = contractAddress as `0x${string}`;
        let opened = 0;

        const sendAndWait = async (fn: () => Promise<`0x${string}`>) => {
            const hash = await fn();
            await this.publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
            await delay();
        };

        for (let marketId = 0; marketId < count; marketId++) {
            const state = await this.getMarketState(contractAddress, marketId);
            if (state === MarketState.Inactive) {
                console.log(`   🔓 Opening market ${marketId}...`);
                await sendAndWait(() => this.walletClient.writeContract({
                    address: matchAddr,
                    abi: FOOTBALL_MATCH_ABI,
                    functionName: 'openMarket',
                    args: [BigInt(marketId)],
                }));
                opened++;
            }
        }
        return opened;
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
