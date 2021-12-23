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
