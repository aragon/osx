import {PluginPreparation} from '../../generated/schema';
import {
  handleInstallationApplied,
  handleInstallationPrepared,
  handleUninstallationApplied,
  handleUninstallationPrepared,
  handleUpdateApplied,
  handleUpdatePrepared,
} from '../../src/plugin/pluginSetupProcessor';
import {PERMISSION_OPERATIONS} from '../../src/plugin/utils';
import {getSupportsInterface} from '../../tests/dao/utils';
import {
  ADDRESS_TWO,
  ADDRESS_THREE,
  DAO_ADDRESS,
  ADDRESS_FOUR,
  ADDRESS_FIVE,
  ADDRESS_ZERO,
  PLUGIN_SETUP_ID,
  ADDRESS_SIX,
  APPLIED_PLUGIN_SETUP_ID,
  CONTRACT_ADDRESS,
} from '../constants';
import {
  createInstallationAppliedEvent,
  createInstallationPreparedEvent,
  createUninstallationAppliedEvent,
  createUninstallationPreparedEvent,
  createUpdateAppliedEvent,
  createUpdatePreparedEvent,
} from './utils';
import {
  generateDaoEntityId,
  generatePluginEntityId,
  generatePluginInstallationEntityId,
  generatePluginPermissionEntityId,
  generatePluginPreparationEntityId,
  generatePluginRepoEntityId,
  generatePluginVersionEntityId,
} from '@aragon/osx-commons-subgraph';
import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {assert, clearStore, test} from 'matchstick-as';

const daoAddress = Address.fromString(DAO_ADDRESS);
const daoEntityId = generateDaoEntityId(daoAddress);
const pluginAddress = Address.fromString(CONTRACT_ADDRESS);
const pluginEntityId = generatePluginEntityId(pluginAddress);
const setupId = PLUGIN_SETUP_ID;
const pluginRepoAddress = Address.fromString(ADDRESS_TWO);
const pluginRepoEntityId = generatePluginRepoEntityId(pluginRepoAddress);

test('InstallationPrepared event', function () {
  let pluginVersionId = generatePluginVersionEntityId(pluginRepoAddress, 1, 1);
  let pluginInstallationEntityId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!pluginInstallationEntityId) {
    throw new Error('Failed to get installationId');
  }
  pluginInstallationEntityId = pluginInstallationEntityId as string;
  let pluginPreparationEntityId = generatePluginPreparationEntityId(
    pluginInstallationEntityId,
    Bytes.fromHexString(setupId)
  );

  let versionTuple = new ethereum.Tuple();
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromString('1')));
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromString('1')));

  let permissions = [
    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('0')),
      ethereum.Value.fromAddress(daoAddress),
      ethereum.Value.fromAddress(pluginAddress),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_ZERO)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x1234')),
    ],

    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('2')),
      ethereum.Value.fromAddress(daoAddress),
      ethereum.Value.fromAddress(pluginAddress),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_SIX)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x5678')),
    ],
  ];

  getSupportsInterface(pluginEntityId, '0xffffffff', false);

  let event = createInstallationPreparedEvent(
    ADDRESS_THREE,
    daoEntityId,
    pluginEntityId,
    Bytes.fromHexString(setupId),
    pluginRepoEntityId,
    versionTuple,
    Bytes.fromHexString('0x00'),
    [ADDRESS_FOUR, ADDRESS_FIVE],
    permissions
  );

  handleInstallationPrepared(event);

  assert.entityCount('PluginPreparation', 1);
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'id',
    pluginPreparationEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'installation',
    pluginInstallationEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'creator',
    ADDRESS_THREE
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'dao',
    daoEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'preparedSetupId',
    setupId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'pluginRepo',
    pluginRepoEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'pluginVersion',
    pluginVersionId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'data',
    '0x00'
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'pluginAddress',
    pluginEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'type',
    'Installation'
  );

  let helpers = [
    Address.fromString(ADDRESS_FOUR),
    Address.fromString(ADDRESS_FIVE),
  ];
  let pluginPreparation = PluginPreparation.load(pluginPreparationEntityId);
  if (!pluginPreparation) {
    throw new Error(
      `PluginPrepation with id ${pluginPreparationEntityId} not found`
    );
  }

  assert.equals(
    ethereum.Value.fromBytesArray(pluginPreparation.helpers),
    ethereum.Value.fromAddressArray(helpers)
  );

  assert.entityCount('PluginPermission', permissions.length);
  for (let i = 0; i < permissions.length; i++) {
    let permission = permissions[i];
    let operation = permission[0].toI32();
    let pluginPermissionEntityId = generatePluginPermissionEntityId(
      pluginPreparationEntityId,
      operation,
      permission[1].toAddress(),
      permission[2].toAddress(),
      permission[4].toBytes()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'id',
      pluginPermissionEntityId
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'operation',
      PERMISSION_OPERATIONS.get(operation) || ''
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'where',
      permission[1].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'who',
      permission[2].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'permissionId',
      permission[4].toBytes().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'condition',
      permission[3].toAddress().toHexString()
    );
  }

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'dao',
    daoEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'state',
    'InstallationPrepared'
  );

  // TODO: once matchstick can support polymorphism, we should have a test like:
  // @dev: create a DAO in state so that we can check if IPlugin will be linked to the DAO
  // let daoEntity = createDaoEntityState()
  // assert.i32Equals(daoEntity.plugins.length, 1);

  clearStore();
});

test('InstallationApplied event', function () {
  let pluginInstallationEntityId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!pluginInstallationEntityId) {
    throw new Error('Failed to get installationId');
  }
  pluginInstallationEntityId = pluginInstallationEntityId as string;
  let pluginPreparationEntityId = generatePluginPreparationEntityId(
    pluginInstallationEntityId,
    Bytes.fromHexString(setupId)
  );

  let event = createInstallationAppliedEvent(
    daoEntityId,
    pluginEntityId,
    Bytes.fromHexString(setupId),
    Bytes.fromHexString(APPLIED_PLUGIN_SETUP_ID)
  );
  handleInstallationApplied(event);

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'id',
    pluginInstallationEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'dao',
    daoEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'plugin',
    pluginEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'appliedPreparation',
    pluginPreparationEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'appliedSetupId',
    APPLIED_PLUGIN_SETUP_ID
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'state',
    'Installed'
  );

  clearStore();
});

test('UpdatePrepared event', function () {
  const build = 1;
  const release = 2;
  const pluginVersionEntityId = generatePluginVersionEntityId(
    pluginRepoAddress,
    build,
    release
  );
  let pluginInstallationEntityId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!pluginInstallationEntityId) {
    throw new Error('Failed to get installationId');
  }
  pluginInstallationEntityId = pluginInstallationEntityId as string;
  const pluginPreparationEntityId = generatePluginPreparationEntityId(
    pluginInstallationEntityId,
    Bytes.fromHexString(setupId)
  );

  let versionTuple = new ethereum.Tuple();
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromI32(build)));
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromI32(release)));

  let permissions = [
    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('0')),
      ethereum.Value.fromAddress(daoAddress),
      ethereum.Value.fromAddress(pluginAddress),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_ZERO)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x1234')),
    ],

    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('2')),
      ethereum.Value.fromAddress(daoAddress),
      ethereum.Value.fromAddress(pluginAddress),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_SIX)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x5678')),
    ],
  ];

  let event = createUpdatePreparedEvent(
    ADDRESS_THREE,
    daoEntityId,
    pluginEntityId,
    Bytes.fromHexString(setupId),
    pluginRepoEntityId,
    versionTuple,
    [],
    [ADDRESS_FOUR, ADDRESS_FIVE],
    permissions,
    Bytes.fromHexString('0x00'),
    Bytes.fromHexString('0x12')
  );
  handleUpdatePrepared(event);

  assert.entityCount('PluginPreparation', 1);
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'id',
    pluginPreparationEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'installation',
    pluginInstallationEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'creator',
    ADDRESS_THREE
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'dao',
    daoEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'preparedSetupId',
    setupId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'pluginRepo',
    pluginRepoEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'pluginVersion',
    pluginVersionEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'data',
    '0x12'
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'type',
    'Update'
  );

  let helpers = [
    Address.fromString(ADDRESS_FOUR),
    Address.fromString(ADDRESS_FIVE),
  ];
  let pluginPreparation = PluginPreparation.load(pluginPreparationEntityId);
  if (!pluginPreparation) {
    throw new Error(
      `PluginPrepation with id ${pluginPreparationEntityId} not found`
    );
  }

  assert.equals(
    ethereum.Value.fromBytesArray(pluginPreparation.helpers),
    ethereum.Value.fromAddressArray(helpers)
  );

  assert.entityCount('PluginPermission', 2);

  for (let i = 0; i < permissions.length; i++) {
    let permission = permissions[i];
    let operation = permission[0].toI32();
    const pluginPermissionEntityId = generatePluginPermissionEntityId(
      pluginPreparationEntityId,
      operation,
      permission[1].toAddress(),
      permission[2].toAddress(),
      permission[4].toBytes()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'id',
      pluginPermissionEntityId
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'operation',
      PERMISSION_OPERATIONS.get(operation) || ''
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'where',
      permission[1].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'who',
      permission[2].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'permissionId',
      permission[4].toBytes().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'condition',
      permission[3].toAddress().toHexString()
    );
  }

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'dao',
    daoEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'state',
    'UpdatePrepared'
  );

  clearStore();
});

test('UpdateApplied event', function () {
  let pluginInstallationEntityId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!pluginInstallationEntityId) {
    throw new Error('Failed to get installationId');
  }
  pluginInstallationEntityId = pluginInstallationEntityId as string;
  const pluginPreparationEntityId = generatePluginPreparationEntityId(
    pluginInstallationEntityId,
    Bytes.fromHexString(setupId)
  );

  getSupportsInterface(pluginEntityId, '0xffffffff', false);

  let event = createUpdateAppliedEvent(
    daoEntityId,
    pluginEntityId,
    Bytes.fromHexString(setupId),
    Bytes.fromHexString(APPLIED_PLUGIN_SETUP_ID)
  );
  handleUpdateApplied(event);

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'id',
    pluginInstallationEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'dao',
    daoEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'plugin',
    pluginEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'appliedPreparation',
    pluginPreparationEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'appliedSetupId',
    APPLIED_PLUGIN_SETUP_ID
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'state',
    'Installed'
  );

  clearStore();
});

test('UninstallationPrepared event', function () {
  let pluginInstallationEntityId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!pluginInstallationEntityId) {
    throw new Error('Failed to get installationId');
  }
  pluginInstallationEntityId = pluginInstallationEntityId as string;
  const build = 1;
  const release = 2;
  const pluginPreparationEntityId = generatePluginPreparationEntityId(
    pluginInstallationEntityId,
    Bytes.fromHexString(setupId)
  );
  const pluginVersionEntityId = generatePluginVersionEntityId(
    pluginRepoAddress,
    build,
    release
  );
  let versionTuple = new ethereum.Tuple();
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromI32(build)));
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromI32(release)));

  let permissions = [
    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('0')),
      ethereum.Value.fromAddress(daoAddress),
      ethereum.Value.fromAddress(pluginAddress),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_ZERO)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x1234')),
    ],

    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('2')),
      ethereum.Value.fromAddress(daoAddress),
      ethereum.Value.fromAddress(pluginAddress),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_SIX)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x5678')),
    ],
  ];

  let event = createUninstallationPreparedEvent(
    ADDRESS_THREE,
    daoEntityId,
    Bytes.fromHexString(setupId),
    pluginRepoEntityId,
    versionTuple,
    pluginEntityId,
    [ADDRESS_FOUR, ADDRESS_FIVE],
    Bytes.fromHexString('0x00'),
    permissions
  );
  handleUninstallationPrepared(event);

  assert.entityCount('PluginPreparation', 1);
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'id',
    pluginPreparationEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'installation',
    pluginInstallationEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'creator',
    ADDRESS_THREE
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'dao',
    daoEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'preparedSetupId',
    setupId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'pluginRepo',
    pluginRepoEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'pluginVersion',
    pluginVersionEntityId
  );
  assert.fieldEquals(
    'PluginPreparation',
    pluginPreparationEntityId,
    'type',
    'Uninstallation'
  );

  let pluginPreparation = PluginPreparation.load(pluginPreparationEntityId);
  if (!pluginPreparation) {
    throw new Error(
      `PluginPrepation with id ${pluginPreparationEntityId} not found`
    );
  }
  assert.equals(
    ethereum.Value.fromBytesArray(pluginPreparation.helpers),
    ethereum.Value.fromAddressArray([])
  );

  assert.entityCount('PluginPermission', 2);

  for (let i = 0; i < permissions.length; i++) {
    const permission = permissions[i];
    const operation = permission[0].toI32();
    const pluginPermissionEntityId = generatePluginPermissionEntityId(
      pluginPreparationEntityId,
      operation,
      permission[1].toAddress(),
      permission[2].toAddress(),
      permission[4].toBytes()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'id',
      pluginPermissionEntityId
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'operation',
      PERMISSION_OPERATIONS.get(operation) || ''
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'where',
      permission[1].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'who',
      permission[2].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'permissionId',
      permission[4].toBytes().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      pluginPermissionEntityId,
      'condition',
      permission[3].toAddress().toHexString()
    );
  }

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'dao',
    daoEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'state',
    'UninstallPrepared'
  );

  clearStore();
});

test('UninstallationApplied event', function () {
  let pluginInstallationEntityId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!pluginInstallationEntityId) {
    throw new Error('Failed to get pluginInstallationEntityId');
  }
  pluginInstallationEntityId = pluginInstallationEntityId as string;
  const pluginPreparationEntityId = generatePluginPreparationEntityId(
    pluginInstallationEntityId,
    Bytes.fromHexString(setupId)
  );

  let event = createUninstallationAppliedEvent(
    daoEntityId,
    pluginEntityId,
    setupId
  );
  handleUninstallationApplied(event);

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'dao',
    daoEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'appliedPreparation',
    pluginPreparationEntityId
  );
  assert.fieldEquals(
    'PluginInstallation',
    pluginInstallationEntityId,
    'state',
    'Uninstalled'
  );
});
