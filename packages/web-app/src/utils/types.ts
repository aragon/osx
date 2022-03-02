import {Address} from '@aragon/ui-components/dist/utils/addresses';
import {TimeFilter, TransferTypes} from './constants';

/**
 * Response object from fetching token USD values
 */
export type TokenPrices = {
  [key: string]: string | undefined;
};

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
  transferType: TransferTypes;
  usdValue: string;
  isPending?: boolean;
};

/* PROPOSAL DATA ============================================================ */

export type ProposalData = UncategorizedProposalData & {
  type: 'draft' | 'pending' | 'active' | 'succeeded' | 'executed' | 'defeated';
};

type Seconds = string;

export type UncategorizedProposalData = {
  id: string;
  metadata: ProposalMetadata;
  vote: VotingData;
  execution: ExecutionData;
};

type ProposalMetadata = {
  title: string;
  description: string;
  publisher: Address;
  resources?: ProposalResource[];
  published?: BlockChainInteraction;
  executed?: BlockChainInteraction;
};

type ProposalResource = {
  title: string;
  url: string;
};

type BlockChainInteraction = {
  date: Seconds;
  block: string;
};

export type VotingData = {
  start: Seconds;
  end: Seconds;
  total: number;
  results: Record<string, number>; // e.g. option -> amount of votes
  tokenSymbol: string;
};

type ExecutionData = {
  from: Address;
  to: Address;
  amount: number;
};

/* GENERIC HOOK RETURN TYPE ================================================= */

/** Return type for data hooks */
export type HookData<T> = {
  data: T;
  isLoading: boolean;
  error?: Error;
};

export type SupportedChainId = 1 | 4;

/**
 * Allowed Actions for each dao
 */
export type ActionsTypes =
  | 'add_remove_address'
  | 'withdraw_assets'
  | 'mint_token'
  | 'external_contract';

export type ParamType = {
  type: string;
  name?: string;
  value: string;
};

/**
 *  Inputs prop is using for custom smart contract methods that have unknown fields
 */
export type ActionItem = {
  name: ActionsTypes;
  inputs?: ParamType[];
};
export type NetworkIndicatorStatus = 'default' | 'testnet' | 'unsupported';
