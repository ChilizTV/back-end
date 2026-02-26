import { config } from 'dotenv';
import { logger } from '../logging/logger';

config();

export interface ChilizToken {
    name: string;
    symbol: string;
    address: string;
}

export interface ChilizNetworkConfig {
    rpcUrl: string;
    tokens: ChilizToken[];
}

const TESTNET_TOKENS: ChilizToken[] = [
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

const MAINNET_TOKENS: ChilizToken[] = [
    {
        name: 'Paris Saint-Germain',
        symbol: 'PSG',
        address: '0xc2661815C69c2B3924D3dd0c2C1358A1E38A3105'
    },
    {
        name: 'Tottenham Hotspur',
        symbol: 'SPURS',
        address: '0x93D84Ff2c5F5a5A3D7291B11aF97679E75eEAc92'
    },
    {
        name: 'FC Barcelona',
        symbol: 'BAR',
        address: '0xFD3C73b3B09D418841dd6Aff341b2d6e3abA433b'
    },
    {
        name: 'AC Milan',
        symbol: 'ACM',
        address: '0xF9C0F80a6c67b1B39bdDF00ecD57f2533ef5b688'
    },
    {
        name: 'OG',
        symbol: 'OG',
        address: '0x19cA0F4aDb29e2130A56b9C9422150B5dc07f294'
    },
    {
        name: 'Manchester City',
        symbol: 'CITY',
        address: '0x6401b29F40a02578Ae44241560625232A01B3F79'
    },
    {
        name: 'Arsenal',
        symbol: 'AFC',
        address: '0x1d4343d35f0E0e14C14115876D01dEAa4792550b'
    },
    {
        name: 'Flamengo',
        symbol: 'MENGO',
        address: '0xD1723Eb9e7C6eE7c7e2d421B2758dc0f2166eDDc'
    },
    {
        name: 'Juventus',
        symbol: 'JUV',
        address: '0x454038003a93cf44766aF352F74bad6B745616D0'
    },
    {
        name: 'Napoli',
        symbol: 'NAP',
        address: '0xbE7f1eBB1Fd6246844E093B04991ae0e66D12C77'
    },
    {
        name: 'Atletico Madrid',
        symbol: 'ATM',
        address: '0xe9506F70be469d2369803Ccf41823713BAFe8154'
    },
    {
        name: 'Inter Milan',
        symbol: 'INTER',
        address: '0xc727c9C0f2647CB90B0FCA64d8ddB14878716BeD'
    },
    {
        name: 'AS Roma',
        symbol: 'ASR',
        address: '0xa6610b3361c4c0D206Aa3364cd985016c2d89386'
    },
    {
        name: 'Portugal National Team',
        symbol: 'POR',
        address: '0xFFAD7930B474D45933C93b83A2802204b8787129'
    },
    {
        name: 'Galatasaray',
        symbol: 'GAL',
        address: '0x6DaB8Fe8e5d425F2Eb063aAe58540aA04e273E0d'
    },
    {
        name: 'Trabzonspor',
        symbol: 'TRA',
        address: '0x304193f18f3B34647ae1f549fc825A7e50267c51'
    },
    {
        name: 'Valencia',
        symbol: 'VCF',
        address: '0xba0c26485b1909f80476067272d74A99Cc0E1D57'
    },
    {
        name: 'Palmeiras',
        symbol: 'VERDAO',
        address: '0x971364Ec452958d4D65Ba8D508FAa226d7117279'
    },
    {
        name: 'Sao Paulo FC',
        symbol: 'SPFC',
        address: '0x540165b9dFdDE31658F9BA0Ca5504EdA448BFfd0'
    },
    {
        name: 'Corinthians',
        symbol: 'SCCP',
        address: '0x20BFeab58f8bE903753d037Ba7e307fc77c97388'
    },
    {
        name: 'Ultimate Fighting Championship',
        symbol: 'UFC',
        address: '0x0ffa63502f957b66e61F87761cc240e51C74cee5'
    },
    {
        name: 'Everton',
        symbol: 'EFC',
        address: '0xaBEE61f8fF0eADd8D4ee87092792aAF2D9B2CA8e'
    },
    {
        name: 'AS Monaco',
        symbol: 'ASM',
        address: '0x371863096CF5685cD37AE00C28DE10b6edBab3Fe'
    },
    {
        name: 'Leeds United',
        symbol: 'LUFC',
        address: '0xF67A8a4299f7EBF0c58DbFb38941D0867f300C30'
    },
    {
        name: 'Aston Villa',
        symbol: 'AVL',
        address: '0x095726841DC9Bf395114Ac83f8fd42B176cFAd10'
    }
];

const TESTNET_CONFIG: ChilizNetworkConfig = {
    rpcUrl: 'https://sepolia.base.org',
    tokens: TESTNET_TOKENS
};

const MAINNET_CONFIG: ChilizNetworkConfig = {
    rpcUrl: 'https://rpc.ankr.com/chiliz',
    tokens: MAINNET_TOKENS
};

const NETWORK = (process.env.NETWORK || 'testnet').toLowerCase();

export const chilizConfig: ChilizNetworkConfig = NETWORK === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;

export const networkType: 'testnet' | 'mainnet' = NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

logger.info('Chiliz Network Configuration', {
    network: networkType.toUpperCase(),
    rpcUrl: chilizConfig.rpcUrl,
    supportedTokens: chilizConfig.tokens.length
});
