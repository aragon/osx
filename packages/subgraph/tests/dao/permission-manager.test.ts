import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  crypto
} from '@graphprotocol/graph-ts';

import {
  handleMadeImmutable,
  handleGranted,
  handleRevoked
} from '../../src/dao/dao';
import {Permission, ContractPermissionId} from '../../generated/schema';
import {
  DAO_ADDRESS,
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  ONE_ETH,
  VOTING_ADDRESS,
  ADDRESS_TWO
} from '../constants';
import {createTokenCalls} from '../utils';
import {
  createNewMadeImmutableEvent,
  createNewGrantedEvent,
  createNewRevokedEvent,
  getEXECUTE_PERMISSION_ID,
  getEXECUTE_PERMISSION_IDreverted,
  getParticipationRequiredPct,
  getSupportRequiredPct,
  getVotingToken,
  getVotesLength,
  getMinDuration,
  getSupportsInterface
} from './utils';

import {
  ERC20_VOTING_INTERFACE,
  ALLOWLIST_VOTING_INTERFACE
} from '../../src/utils/constants';

let contractPermissionId = Bytes.fromByteArray(
  crypto.keccak256(ByteArray.fromUTF8('EXECUTE_PERMISSION'))
);

function testPackages(supportsErc20VotingInterface: boolean): void {
  // create event and run it's handler
  let grantedEvent = createNewGrantedEvent(
    contractPermissionId,
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    ADDRESS_TWO,
    DAO_ADDRESS
  );

  // launch calls
  getEXECUTE_PERMISSION_ID(DAO_ADDRESS, contractPermissionId);
  getSupportRequiredPct(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));
  getParticipationRequiredPct(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));
  getMinDuration(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));
  getVotesLength(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));

  if (supportsErc20VotingInterface) {
    createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
    getVotingToken(VOTING_ADDRESS, DAO_TOKEN_ADDRESS);
    getSupportsInterface(
      VOTING_ADDRESS,
      ERC20_VOTING_INTERFACE,
      supportsErc20VotingInterface
    );
    getSupportsInterface(VOTING_ADDRESS, ALLOWLIST_VOTING_INTERFACE, false);
  } else {
    getSupportsInterface(
      VOTING_ADDRESS,
      ERC20_VOTING_INTERFACE,
      supportsErc20VotingInterface
    );
    getSupportsInterface(VOTING_ADDRESS, ALLOWLIST_VOTING_INTERFACE, true);
  }

  // handle event
  handleGranted(grantedEvent);

  // checks
  // contractPermissionId
  let contractPermissionIdEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    contractPermissionId.toHexString();

  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'id',
    contractPermissionIdEntityID
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'where',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'permissionId',
    contractPermissionId.toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'immutable',
    'false'
  );

  // permission
  let permissionEntityID =
    contractPermissionIdEntityID +
    '_' +
    Address.fromString(VOTING_ADDRESS).toHexString();

  assert.fieldEquals(
    'Permission',
    permissionEntityID,
    'id',
    permissionEntityID
  );

  // governance
  let daoPackageEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    Address.fromString(VOTING_ADDRESS).toHexString();

  assert.fieldEquals(
    'DaoPackage',
    daoPackageEntityID,
    'id',
    daoPackageEntityID
  );

  // packages
  if (supportsErc20VotingInterface) {
    assert.fieldEquals(
      'ERC20VotingPackage',
      Address.fromString(VOTING_ADDRESS).toHexString(),
      'id',
      Address.fromString(VOTING_ADDRESS).toHexString()
    );
  } else {
    assert.fieldEquals(
      'AllowlistPackage',
      Address.fromString(VOTING_ADDRESS).toHexString(),
      'id',
      Address.fromString(VOTING_ADDRESS).toHexString()
    );
  }

  clearStore();
}

test('Run dao (handleGranted) mappings with mock event for ERC20 Voting', () => {
  testPackages(true);
});

test('Run dao (handleGranted) mappings with mock event for Allowlist Voting', () => {
  testPackages(false);
});

test('Run dao (handleGranted) mappings with reverted mocke call', () => {
  // create event and run it's handler
  let grantedEvent = createNewGrantedEvent(
    contractPermissionId,
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    ADDRESS_TWO,
    DAO_ADDRESS
  );

  // launch calls
  getEXECUTE_PERMISSION_IDreverted(DAO_ADDRESS);

  // handle event
  handleGranted(grantedEvent);

  // checks
  // contractPermissionId
  let contractPermissionIdEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    contractPermissionId.toHexString();

  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'id',
    contractPermissionIdEntityID
  );

  // governance
  let daoPackageEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    Address.fromString(VOTING_ADDRESS).toHexString();

  assert.notInStore('DaoPackage', daoPackageEntityID);

  clearStore();
});

test('Run dao (handleRevoked) mappings with mock event', () => {
  // create state
  let contractPermissionIdEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    contractPermissionId.toHexString();
  // permission
  let permissionEntityID =
    contractPermissionIdEntityID +
    '_' +
    Address.fromString(VOTING_ADDRESS).toHexString();

  let contractPermissionIdEntity = new ContractPermissionId(
    contractPermissionIdEntityID
  );
  contractPermissionIdEntity.dao = Address.fromString(
    DAO_ADDRESS
  ).toHexString();
  contractPermissionIdEntity.where = Address.fromString(DAO_ADDRESS);
  contractPermissionIdEntity.permissionId = contractPermissionId;
  contractPermissionIdEntity.immutable = false;
  contractPermissionIdEntity.save();

  let permissionEntity = new Permission(permissionEntityID);
  permissionEntity.contractPermissionId = contractPermissionIdEntity.id;
  permissionEntity.save();

  // check state exist
  assert.fieldEquals(
    'Permission',
    permissionEntityID,
    'id',
    permissionEntityID
  );

  // create event and run it's handler
  let revokedEvent = createNewRevokedEvent(
    contractPermissionId,
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    DAO_ADDRESS
  );

  getEXECUTE_PERMISSION_ID(DAO_ADDRESS, contractPermissionId);

  // handle event
  handleRevoked(revokedEvent);

  // checks
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'id',
    contractPermissionIdEntityID
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'where',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'permissionId',
    contractPermissionId.toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'immutable',
    'false'
  );

  assert.notInStore('Permission', permissionEntityID);

  clearStore();
});

test('Run dao (handleMadeImmutable) mappings with mock event', () => {
  // create state
  let contractPermissionIdEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    contractPermissionId.toHexString();

  let contractPermissionIdEntity = new ContractPermissionId(
    contractPermissionIdEntityID
  );
  contractPermissionIdEntity.dao = Address.fromString(
    DAO_ADDRESS
  ).toHexString();
  contractPermissionIdEntity.where = Address.fromString(DAO_ADDRESS);
  contractPermissionIdEntity.permissionId = contractPermissionId;
  contractPermissionIdEntity.immutable = false;
  contractPermissionIdEntity.save();

  // check state exist
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'id',
    contractPermissionIdEntityID
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'immutable',
    'false'
  );

  // create event and run it's handler
  let immutableEvent = createNewMadeImmutableEvent(
    contractPermissionId,
    ADDRESS_ONE,
    DAO_ADDRESS,
    DAO_ADDRESS
  );

  // handle event
  handleMadeImmutable(immutableEvent);

  // checks
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'id',
    contractPermissionIdEntityID
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'where',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'permissionId',
    contractPermissionId.toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'immutable',
    'true'
  );

  clearStore();
});
