import {generateActionBatchEntityId} from '../src/dao/ids';
import {
  generatePluginEntityId,
  generateProposalEntityId,
} from '@aragon/osx-commons-subgraph';
import {Address, BigInt, Bytes} from '@graphprotocol/graph-ts';

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
export const ADDRESS_ONE = '0x0000000000000000000000000000000000000001';
export const ADDRESS_TWO = '0x0000000000000000000000000000000000000002';
export const ADDRESS_THREE = '0x0000000000000000000000000000000000000003';
export const ADDRESS_FOUR = '0x0000000000000000000000000000000000000004';
export const ADDRESS_FIVE = '0x0000000000000000000000000000000000000005';
export const ADDRESS_SIX = '0x0000000000000000000000000000000000000006';
export const ADDRESS_SEVEN = '0x0000000000000000000000000000000000000007';
export const DAO_ADDRESS = '0x00000000000000000000000000000000000000da';
export const CONTRACT_ADDRESS = '0x00000000000000000000000000000000000000Ad';
export const DAO_TOKEN_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
export const DEFAULT_MOCK_EVENT_ADDRESS =
  '0xA16081F360e3847006dB660bae1c6d1b2e17eC2A';

export const ZERO = '0';
export const ONE = '1';
export const TWO = '2';
export const THREE = '3';

export const PLUGIN_PROPOSAL_ID = ZERO;

export const STRING_DATA = 'Some String Data ...';

export const ONE_ETH = '1000000000000000000';
export const HALF_ETH = '500000000000000000';

export const ERC20_AMOUNT_HALF = '10000';
export const ERC20_AMOUNT_FULL = '20000';
export const ERC20_TOTAL_SUPPLY = '10';
export const ERC20_DECIMALS = '6';
export const TOKEN_SYMBOL = 'symbol';
export const TOKEN_NAME = 'name';

export const HOUR = '3600';
export const SNAPSHOT_BLOCK = '100';

// Use 1 for testing as default value is anyways 0
// and test might succeed even though it shouldn't
export const ALLOW_FAILURE_MAP = '1';
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

export const ACTION_BATCH_ID = generateActionBatchEntityId(
  Address.fromString(CONTRACT_ADDRESS),
  Address.fromString(DAO_ADDRESS),
  Bytes.fromHexString(ONE_BYTES32),
  Bytes.fromHexString(HALF_UINT256_BYTES32),
  BigInt.fromString('1')
);

export const PROPOSAL_ENTITY_ID = generateProposalEntityId(
  Address.fromString(CONTRACT_ADDRESS),
  BigInt.fromString(PLUGIN_PROPOSAL_ID)
);

export const PLUGIN_ENTITY_ID = generatePluginEntityId(
  Address.fromString(CONTRACT_ADDRESS)
);
