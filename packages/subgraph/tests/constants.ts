import {Address, BigInt} from '@graphprotocol/graph-ts';

import {getProposalId} from '../src/utils/proposals';

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
export const ADDRESS_ONE = '0x0000000000000000000000000000000000000001';
export const ADDRESS_TWO = '0x0000000000000000000000000000000000000002';
export const ADDRESS_THREE = '0x0000000000000000000000000000000000000003';
export const ADDRESS_FOUR = '0x0000000000000000000000000000000000000004';
export const ADDRESS_FIVE = '0x0000000000000000000000000000000000000005';
export const ADDRESS_SIX = '0x0000000000000000000000000000000000000006';
export const DAO_ADDRESS = '0x00000000000000000000000000000000000000da';
export const CONTRACT_ADDRESS = '0x00000000000000000000000000000000000000Ad';
export const DAO_TOKEN_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

export const ZERO = '0';
export const ONE = '1';
export const TWO = '2';
export const THREE = '3';

export const PROPOSAL_ID = ZERO;

export const STRING_DATA = 'Some String Data ...';

export const ONE_ETH = '1000000000000000000';
export const HALF_ETH = '500000000000000000';

export const ERC20_AMOUNT_HALF = '10000';
export const ERC20_AMOUNT_FULL = '20000';

export const ONE_HOUR = '3600';

export const VOTING_MODE: string = ONE; // EarlyExecution
export const SUPPORT_THRESHOLD = '500000'; // 50*10**4 = 50%
export const MIN_PARTICIPATION = '500000'; // 50*10**4 = 50%
export const MIN_DURATION = ONE_HOUR;

export const MIN_PROPOSER_VOTING_POWER = ZERO;
export const START_DATE = '1644851000';
export const END_DATE = '1644852000';
export const SNAPSHOT_BLOCK = '100';

// Use 1 for testing as default value is anyways 0
// and test might succeed even though it shouldn't
export const ALLOW_FAILURE_MAP = '1';

export const MIN_VOTING_POWER = TWO;
export const TOTAL_VOTING_POWER = THREE;
export const CREATED_AT = ONE;

export const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ONE_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000001';
export const HALF_UINT256_BYTES32 =
  '0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
export const MAX_UINT256_BYTES32 =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

export const MAX_UINT256_NUMBER_STRING =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

export const PLUGIN_SETUP_ID =
  '0xfb3fd2c4cd4e19944dd3f8437e67476240cd9e3efb2294ebd10c59c8f1d6817c';
export const APPLIED_PLUGIN_SETUP_ID =
  '0x00000000cd4e19944dd3f8437e67476240cd9e3efb2294ebd10c59c8f1d6817c';

export const PROPOSAL_ENTITY_ID = getProposalId(
  Address.fromString(CONTRACT_ADDRESS),
  BigInt.fromString(PROPOSAL_ID)
);

export const PLUGIN_ENTITY_ID = Address.fromString(
  CONTRACT_ADDRESS
).toHexString();
