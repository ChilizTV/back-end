import { defineChain } from "viem";

// Define Base Sepolia chain for viem
export const baseSepolia = defineChain({
    id: 84532,
    name: 'Base Sepolia',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: ['https://sepolia.base.org'],
        },
    },
    blockExplorers: {
        default: {
            name: 'BaseScan',
            url: 'https://sepolia.basescan.org',
        },
    },
    testnet: true,
});