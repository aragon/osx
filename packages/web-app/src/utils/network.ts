import {CuratedTokensType} from './types';

/**
 * A token list added to network config (needed for fetching token balances)
 */
export const curatedTokens: CuratedTokensType = {
  1: {
    networkName: 'mainnet',
    curatedTokens: {
      DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
      USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
  },
  4: {
    networkName: 'rinkeby',
    curatedTokens: {
      DAI: '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735',
      USDT: '0x3B00Ef435fA4FcFF5C209a37d1f3dcff37c705aD',
      USDC: '0xeb8f08a975Ab53E34D8a0330E0D34de942C95926',
    },
  },
};
