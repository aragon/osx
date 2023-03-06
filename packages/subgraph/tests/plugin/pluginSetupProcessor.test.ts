import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  ADDRESS_THREE,
  DAO_ADDRESS,
  ADDRESS_FOUR,
  ADDRESS_FIVE,
  ADDRESS_ZERO,
  PLUGIN_SETUP_ID,
  ADDRESS_SIX,
  APPLIED_PLUGIN_SETUP_ID,
  CONTRACT_ADDRESS
} from '../constants';
import {
  createInstallationAppliedEvent,
  createInstallationPreparedEvent,
  createUninstallationAppliedEvent,
  createUninstallationPreparedEvent,
  createUpdateAppliedEvent,
  createUpdatePreparedEvent
} from './utils';
import {
  handleInstallationApplied,
  handleInstallationPrepared,
  handleUninstallationApplied,
  handleUninstallationPrepared,
  handleUpdateApplied,
  handleUpdatePrepared
} from '../../src/plugin/pluginSetupProcessor';
import {assert, clearStore, test} from 'matchstick-as';
import {PluginPreparation} from '../../generated/schema';
import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {
  createDaoEntityState,
  getSupportsInterface
} from '../../tests/dao/utils';
import {
  ADDRESSLIST_VOTING_INTERFACE,
  ADMIN_INTERFACE,
  MULTISIG_INTERFACE,
  TOKEN_VOTING_INTERFACE
} from '../../src/utils/constants';
import {
  getPluginInstallationId,
  PERMISSION_OPERATIONS
} from '../../src/plugin/utils';

test('InstallationPrepared event', function() {
  let dao = DAO_ADDRESS;
  let plugin = CONTRACT_ADDRESS;
  let setupId = PLUGIN_SETUP_ID;
  let pluginSetupRepo = ADDRESS_TWO;
  let pluginVersionId = `${pluginSetupRepo}_1_1`;
  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    throw new Error('Failed to get installationId');
  }

  let installationIdString = installationId.toHexString();
  let preparationId = `${installationIdString}_${setupId}`;

  let versionTuple = new ethereum.Tuple();
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromString('1')));
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromString('1')));

  let permissions = [
    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('0')),
      ethereum.Value.fromAddress(Address.fromString(dao)),
      ethereum.Value.fromAddress(Address.fromString(plugin)),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_ZERO)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x1234'))
    ],

    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('2')),
      ethereum.Value.fromAddress(Address.fromString(dao)),
      ethereum.Value.fromAddress(Address.fromString(plugin)),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_SIX)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x5678'))
    ]
  ];

  getSupportsInterface(plugin, TOKEN_VOTING_INTERFACE, false);
  getSupportsInterface(plugin, ADDRESSLIST_VOTING_INTERFACE, false);
  getSupportsInterface(plugin, ADMIN_INTERFACE, false);
  getSupportsInterface(plugin, MULTISIG_INTERFACE, false);

  let event = createInstallationPreparedEvent(
    ADDRESS_THREE,
    dao,
    plugin,
    Bytes.fromHexString(setupId),
    pluginSetupRepo,
    versionTuple,
    Bytes.fromHexString('0x00'),
    [ADDRESS_FOUR, ADDRESS_FIVE],
    permissions
  );

  handleInstallationPrepared(event);

  assert.entityCount('PluginPreparation', 1);
  assert.fieldEquals('PluginPreparation', preparationId, 'id', preparationId);
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'installation',
    installationIdString
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'creator',
    ADDRESS_THREE
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'dao',
    dao.toLowerCase()
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'preparedSetupId',
    setupId
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'pluginRepo',
    pluginSetupRepo
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'pluginVersion',
    pluginVersionId
  );
  assert.fieldEquals('PluginPreparation', preparationId, 'data', '0x00');
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'pluginAddress',
    plugin.toLowerCase()
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'type',
    'Installation'
  );

  let helpers = [
    Address.fromString(ADDRESS_FOUR),
    Address.fromString(ADDRESS_FIVE)
  ];
  let pluginPreparation = PluginPreparation.load(preparationId);
  if (!pluginPreparation) {
    throw new Error(`PluginPrepation with id ${preparationId} not found`);
  }

  assert.equals(
    ethereum.Value.fromBytesArray(pluginPreparation.helpers),
    ethereum.Value.fromAddressArray(helpers)
  );

  assert.entityCount('PluginPermission', permissions.length);
  for (let i = 0; i < permissions.length; i++) {
    let permission = permissions[i];
    let operation = PERMISSION_OPERATIONS.get(permission[0].toI32());
    let permissionEntityId = `${preparationId}_${operation}_${permission[1]
      .toAddress()
      .toHexString()}_${permission[2]
      .toAddress()
      .toHexString()}_${permission[4].toBytes().toHexString()}`;
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'id',
      permissionEntityId
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'operation',
      operation || ''
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'where',
      permission[1].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'who',
      permission[2].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'permissionId',
      permission[4].toBytes().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'condition',
      permission[3].toAddress().toHexString()
    );
  }

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'dao',
    dao.toLowerCase()
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'state',
    'InstallationPrepared'
  );

  // TODO: once matchstick can support polymorphism, we should have a test like:
  // @dev: create a DAO in state so that we can check if IPlugin will be linked to the DAO
  // let daoEntity = createDaoEntityState()
  // assert.i32Equals(daoEntity.plugins.length, 1);

  clearStore();
});

test('InstallationApplied event', function() {
  let dao = DAO_ADDRESS;
  let plugin = ADDRESS_ONE;
  let setupId = PLUGIN_SETUP_ID;
  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    throw new Error('Failed to get installationId');
  }
  let installationIdString = installationId.toHexString();
  let preparationId = `${installationIdString}_${setupId}`;

  let event = createInstallationAppliedEvent(
    dao,
    plugin,
    Bytes.fromHexString(setupId),
    Bytes.fromHexString(APPLIED_PLUGIN_SETUP_ID)
  );
  handleInstallationApplied(event);

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'id',
    installationIdString
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'dao',
    dao.toLowerCase()
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'plugin',
    plugin.toLowerCase()
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'appliedPreparation',
    preparationId
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'appliedSetupId',
    APPLIED_PLUGIN_SETUP_ID
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'state',
    'Installed'
  );

  clearStore();
});

test('UpdatePrepared event', function() {
  let dao = DAO_ADDRESS;
  let plugin = ADDRESS_ONE;
  let setupId = PLUGIN_SETUP_ID;
  let pluginSetupRepo = ADDRESS_TWO;
  let pluginVersionId = `${pluginSetupRepo}_1_2`;
  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    throw new Error('Failed to get installationId');
  }
  let installationIdString = installationId.toHexString();
  let preparationId = `${installationIdString}_${setupId}`;

  let versionTuple = new ethereum.Tuple();
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromString('1')));
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromString('2')));

  let permissions = [
    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('0')),
      ethereum.Value.fromAddress(Address.fromString(dao)),
      ethereum.Value.fromAddress(Address.fromString(plugin)),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_ZERO)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x1234'))
    ],

    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('2')),
      ethereum.Value.fromAddress(Address.fromString(dao)),
      ethereum.Value.fromAddress(Address.fromString(plugin)),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_SIX)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x5678'))
    ]
  ];

  let event = createUpdatePreparedEvent(
    ADDRESS_THREE,
    dao,
    plugin,
    Bytes.fromHexString(setupId),
    pluginSetupRepo,
    versionTuple,
    [],
    [ADDRESS_FOUR, ADDRESS_FIVE],
    permissions,
    Bytes.fromHexString('0x00'),
    Bytes.fromHexString('0x12')
  );
  handleUpdatePrepared(event);

  assert.entityCount('PluginPreparation', 1);
  assert.fieldEquals('PluginPreparation', preparationId, 'id', preparationId);
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'installation',
    installationIdString
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'creator',
    ADDRESS_THREE
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'dao',
    dao.toLowerCase()
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'preparedSetupId',
    setupId
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'pluginRepo',
    pluginSetupRepo
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'pluginVersion',
    pluginVersionId
  );
  assert.fieldEquals('PluginPreparation', preparationId, 'data', '0x12');
  assert.fieldEquals('PluginPreparation', preparationId, 'type', 'Update');

  let helpers = [
    Address.fromString(ADDRESS_FOUR),
    Address.fromString(ADDRESS_FIVE)
  ];
  let pluginPreparation = PluginPreparation.load(preparationId);
  if (!pluginPreparation) {
    throw new Error(`PluginPrepation with id ${preparationId} not found`);
  }

  assert.equals(
    ethereum.Value.fromBytesArray(pluginPreparation.helpers),
    ethereum.Value.fromAddressArray(helpers)
  );

  assert.entityCount('PluginPermission', 2);

  for (let i = 0; i < permissions.length; i++) {
    let permission = permissions[i];
    let operation = PERMISSION_OPERATIONS.get(permission[0].toI32());
    let permissionEntityId = `${preparationId}_${operation}_${permission[1]
      .toAddress()
      .toHexString()}_${permission[2]
      .toAddress()
      .toHexString()}_${permission[4].toBytes().toHexString()}`;
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'id',
      permissionEntityId
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'operation',
      operation || ''
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'where',
      permission[1].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'who',
      permission[2].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'permissionId',
      permission[4].toBytes().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'condition',
      permission[3].toAddress().toHexString()
    );
  }

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'dao',
    dao.toLowerCase()
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'state',
    'UpdatePrepared'
  );

  clearStore();
});

test('UpdateApplied event', function() {
  let dao = DAO_ADDRESS;
  let plugin = ADDRESS_ONE;
  let setupId = PLUGIN_SETUP_ID;
  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    throw new Error('Failed to get installationId');
  }
  let installationIdString = installationId.toHexString();
  let preparationId = `${installationIdString}_${setupId}`;

  getSupportsInterface(plugin, TOKEN_VOTING_INTERFACE, false);
  getSupportsInterface(plugin, ADDRESSLIST_VOTING_INTERFACE, false);
  getSupportsInterface(plugin, ADMIN_INTERFACE, false);
  getSupportsInterface(plugin, MULTISIG_INTERFACE, false);

  let event = createUpdateAppliedEvent(
    dao,
    plugin,
    Bytes.fromHexString(setupId),
    Bytes.fromHexString(APPLIED_PLUGIN_SETUP_ID)
  );
  handleUpdateApplied(event);

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'id',
    installationIdString
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'dao',
    dao.toLowerCase()
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'plugin',
    plugin.toLowerCase()
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'appliedPreparation',
    preparationId
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'appliedSetupId',
    APPLIED_PLUGIN_SETUP_ID
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'state',
    'Installed'
  );

  clearStore();
});

test('UninstallationPrepared event', function() {
  let dao = DAO_ADDRESS;
  let plugin = ADDRESS_ONE;
  let setupId = PLUGIN_SETUP_ID;
  let pluginSetupRepo = ADDRESS_TWO;
  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    throw new Error('Failed to get installationId');
  }
  let installationIdString = installationId.toHexString();
  let preparationId = `${installationIdString}_${setupId}`;

  let pluginVersionId = `${pluginSetupRepo}_1_2`;
  let versionTuple = new ethereum.Tuple();
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromString('1')));
  versionTuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromString('2')));

  let permissions = [
    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('0')),
      ethereum.Value.fromAddress(Address.fromString(dao)),
      ethereum.Value.fromAddress(Address.fromString(plugin)),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_ZERO)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x1234'))
    ],

    [
      ethereum.Value.fromSignedBigInt(BigInt.fromString('2')),
      ethereum.Value.fromAddress(Address.fromString(dao)),
      ethereum.Value.fromAddress(Address.fromString(plugin)),
      ethereum.Value.fromAddress(Address.fromString(ADDRESS_SIX)),
      ethereum.Value.fromBytes(Bytes.fromHexString('0x5678'))
    ]
  ];

  let event = createUninstallationPreparedEvent(
    ADDRESS_THREE,
    dao,
    Bytes.fromHexString(setupId),
    pluginSetupRepo,
    versionTuple,
    plugin,
    [ADDRESS_FOUR, ADDRESS_FIVE],
    Bytes.fromHexString('0x00'),
    permissions
  );
  handleUninstallationPrepared(event);

  assert.entityCount('PluginPreparation', 1);
  assert.fieldEquals('PluginPreparation', preparationId, 'id', preparationId);
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'installation',
    installationIdString
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'creator',
    ADDRESS_THREE
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'dao',
    dao.toLowerCase()
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'preparedSetupId',
    setupId
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'pluginRepo',
    pluginSetupRepo
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'pluginVersion',
    pluginVersionId
  );
  assert.fieldEquals(
    'PluginPreparation',
    preparationId,
    'type',
    'Uninstallation'
  );

  let pluginPreparation = PluginPreparation.load(preparationId);
  if (!pluginPreparation) {
    throw new Error(`PluginPrepation with id ${preparationId} not found`);
  }
  assert.equals(
    ethereum.Value.fromBytesArray(pluginPreparation.helpers),
    ethereum.Value.fromAddressArray([])
  );

  assert.entityCount('PluginPermission', 2);

  for (let i = 0; i < permissions.length; i++) {
    let permission = permissions[i];
    let operation = PERMISSION_OPERATIONS.get(permission[0].toI32());
    let permissionEntityId = `${preparationId}_${operation}_${permission[1]
      .toAddress()
      .toHexString()}_${permission[2]
      .toAddress()
      .toHexString()}_${permission[4].toBytes().toHexString()}`;
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'id',
      permissionEntityId
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'operation',
      operation || ''
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'where',
      permission[1].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'who',
      permission[2].toAddress().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'permissionId',
      permission[4].toBytes().toHexString()
    );
    assert.fieldEquals(
      'PluginPermission',
      permissionEntityId,
      'condition',
      permission[3].toAddress().toHexString()
    );
  }

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'dao',
    dao.toLowerCase()
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'state',
    'UninstallPrepared'
  );

  clearStore();
});

test('UninstallationApplied event', function() {
  let dao = DAO_ADDRESS;
  let plugin = ADDRESS_ONE;
  let setupId = PLUGIN_SETUP_ID;
  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    throw new Error('Failed to get installationId');
  }
  let installationIdString = installationId.toHexString();
  let preparationId = `${installationIdString}_${setupId}`;

  let event = createUninstallationAppliedEvent(dao, plugin, setupId);
  handleUninstallationApplied(event);

  assert.entityCount('PluginInstallation', 1);
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'dao',
    dao.toLowerCase()
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'appliedPreparation',
    preparationId
  );
  assert.fieldEquals(
    'PluginInstallation',
    installationIdString,
    'state',
    'Uninstalled'
  );
});
