import { parseAbiItem } from "viem";

// ERC20 ABI for reading token balances
export const ERC20_ABI = [
    {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
    }
] as const;

// Minimal ABI for BettingMatchFactory (createFootballMatch)
export const FACTORY_ABI = [
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

// FootballMatch ABI for addMarket, addMarketWithLine, openMarket
export const FOOTBALL_MATCH_ABI = [
    {
        type: 'function',
        name: 'addMarket',
        inputs: [
            { name: 'marketType', type: 'bytes32' },
            { name: 'initialOdds', type: 'uint32' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        type: 'function',
        name: 'addMarketWithLine',
        inputs: [
            { name: 'marketType', type: 'bytes32' },
            { name: 'initialOdds', type: 'uint32' },
            { name: 'line', type: 'int16' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        type: 'function',
        name: 'openMarket',
        inputs: [{ name: 'marketId', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        type: 'function',
        name: 'marketCount',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        type: 'function',
        name: 'getMarketCore',
        inputs: [{ name: 'marketId', type: 'uint256' }],
        outputs: [
            { name: 'state', type: 'uint8', internalType: 'enum BettingMatch.MarketState' },
            { name: 'result', type: 'uint64', internalType: 'uint64' },
            { name: 'createdAt', type: 'uint40', internalType: 'uint40' },
            { name: 'resolvedAt', type: 'uint40', internalType: 'uint40' },
            { name: 'totalPool', type: 'uint256', internalType: 'uint256' }
        ],
        stateMutability: 'view'
    },
    {
        type: 'function',
        name: 'resolveMarket',
        inputs: [
            { name: 'marketId', type: 'uint256' },
            { name: 'result', type: 'uint64' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        type: 'function',
        name: 'setMarketOdds',
        inputs: [
            { name: 'marketId', type: 'uint256' },
            { name: 'newOdds', type: 'uint32' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        type: 'function',
        name: 'getCurrentOdds',
        inputs: [{ name: 'marketId', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint32' }],
        stateMutability: 'view'
    }
] as const;

export const BET_PLACED_EVENT = parseAbiItem(
    'event BetPlaced(uint256 indexed marketId, address indexed user, uint256 betIndex, uint256 amount, uint64 selection, uint32 odds, uint16 oddsIndex)'
);
