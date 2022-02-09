import {Dashboard, Community, Finance, Governance} from './paths';

export const BASE_URL = 'https://api.coingecko.com/api/v3';
export const DEFAULT_CURRENCY = 'usd';
export const INFURA_PROJECT_ID = '7a03fcb37be7479da06f92c5117afd47';

/** Time period options for token price change */
export const enum TimeFilter {
  day = 'day',
  week = 'week',
  month = 'month',
  year = 'year',
  // max = 'max',
}

export const NAV_LINKS = [
  {label: 'Dashboard', path: Dashboard},
  {label: 'Governance', path: Governance},
  {label: 'Finance', path: Finance},
  {label: 'Community', path: Community},
];

export const enum TransferTypes {
  Deposit = 'Deposit',
  Withdraw = 'Withdraw',
}

export const CHAIN_METADATA = {
  main: {
    42161: {
      id: 42161,
      name: 'Arbitrum One',
      domain: 'L2 Blockchain',
      logo: 'https://bridge.arbitrum.io/logo.png',
    },
    1: {
      id: 1,
      name: 'Ethereum',
      domain: 'L1 Blockchain',
      logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880',
    },
    137: {
      id: 137,
      name: 'Polygon',
      domain: 'L2 Blockchain',
      logo: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1624446912',
    },
  },
  test: {
    421611: {
      id: 421611,
      name: 'Arbitrum Rinkeby',
      domain: 'L2 Blockchain',
      logo: 'https://bridge.arbitrum.io/logo.png',
    },
    4: {
      id: 4,
      name: 'Rinkeby',
      domain: 'L1 Blockchain',
      logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880',
    },
    80001: {
      id: 80001,
      name: 'Mumbai',
      domain: 'L2 Blockchain',
      logo: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1624446912',
    },
  },
};
