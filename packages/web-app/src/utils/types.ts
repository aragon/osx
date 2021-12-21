import {Address} from '@aragon/ui-components/dist/utils/addresses';

import {TimeFilter} from './constants';

/**
 * Token with basic information populated from external api and/or blockchain
 * Market information is not included
 */
export type BaseTokenInfo = {
  address: Address;
  count: bigint;
  decimals: number;
  id?: string; // for api call, optional because custom tokens have no id
  imgUrl: string;
  name: string;
  symbol: string;
};

/** Token price changes for each time period in the TimeFilter */
export type TokenPricePercentages = {
  [key in TimeFilter]: number;
};

/**
 * Token populated with the current price, and price change percentages
 * over the multiple periods of time
 */
export type PricedToken = BaseTokenInfo & {
  price?: number;
  percentages?: TokenPricePercentages;
};

/** Token populated with DAO treasury information; final iteration to be displayed */
export type TreasuryToken = PricedToken & {
  treasuryShare?: number;
  changeDuringInterval?: number;
  treasurySharePercentage?: number;
  percentageChangeDuringInterval?: number;
};

/**
 * The balance for a DAO token.
 * Note: count is expected to be the summed up balance **before**
 * having been formatted using the token decimals
 */
export type TokenBalance = {
  address: Address;
  count: bigint;
};

/** A transfer transaction */
export type Transfer = {
  title: string;
  tokenAmount: number;
  tokenSymbol: string;
  transferDate: string;
  transferType: 'Deposit' | 'Withdraw';
  usdValue: string;
  isPending?: boolean;
};

/** Return type for data hooks */
export type HookData<T> = {
  data: T;
  isLoading: boolean;
  error?: Error;
};
