import {Administrator, AdministratorAdminPlugin} from '../../generated/schema';
import {
  handleGranted,
  handleRevoked,
} from '../../src/packages/admin/adminMembers';
import {generateAdministratorAdminPluginEntityId} from '../../src/utils/ids';
import {ADDRESS_ONE, ADDRESS_TWO, DAO_ADDRESS} from '../constants';
import {createGrantedEvent, createRevokedEvent} from './utils';
import {generateEntityIdFromAddress} from '@aragon/osx-commons-subgraph';
import {Address, DataSourceContext} from '@graphprotocol/graph-ts';
import {
  assert,
  clearStore,
  dataSourceMock,
  test,
  describe,
  beforeEach,
  afterEach,
} from 'matchstick-as/assembly/index';

const adminAddress = Address.fromString(ADDRESS_ONE);
const adminEntityId = generateEntityIdFromAddress(adminAddress);
const pluginAddress = Address.fromString(ADDRESS_TWO);
const pluginEntityId = generateEntityIdFromAddress(pluginAddress);

describe('AdminMembers', function () {
  // keccack256 of EXECUTE_PROPOSAL_PERMISSION
  const AdminPermission =
    '0xf281525e53675515a6ba7cc7bea8a81e649b3608423ee2d73be1752cea887889';

  beforeEach(function () {
    let context = new DataSourceContext();
    context.setString('permissionId', AdminPermission);
    context.setString('pluginAddress', pluginEntityId);
    dataSourceMock.setContext(context);
  });

  afterEach(function () {
    clearStore();
  });

  test('handleGranted', function () {
    let event = createGrantedEvent(
      DAO_ADDRESS,
      pluginEntityId,
      adminEntityId,
      AdminPermission
    );
    handleGranted(event);

    assert.entityCount('Administrator', 1);
    assert.fieldEquals('Administrator', adminEntityId, 'id', adminEntityId);
    assert.fieldEquals(
      'Administrator',
      adminEntityId,
      'address',
      adminEntityId
    );

    assert.entityCount('AdministratorAdminPlugin', 1);

    let administratorAdminPluginId = generateAdministratorAdminPluginEntityId(
      pluginAddress,
      adminAddress
    );
    assert.fieldEquals(
      'AdministratorAdminPlugin',
      administratorAdminPluginId,
      'id',
      administratorAdminPluginId
    );
    assert.fieldEquals(
      'AdministratorAdminPlugin',
      administratorAdminPluginId,
      'administrator',
      adminEntityId
    );
    assert.fieldEquals(
      'AdministratorAdminPlugin',
      administratorAdminPluginId,
      'plugin',
      pluginEntityId
    );
  });

  test('handleRevoked', function () {
    let administrator = new Administrator(adminEntityId);
    administrator.address = adminEntityId;
    administrator.save();

    let administratorAdminPluginId = generateAdministratorAdminPluginEntityId(
      pluginAddress,
      adminAddress
    );
    let administratorAdminPluginEntity = new AdministratorAdminPlugin(
      administratorAdminPluginId
    );
    administratorAdminPluginEntity.administrator = ADDRESS_TWO;
    administratorAdminPluginEntity.plugin = ADDRESS_ONE;
    administratorAdminPluginEntity.save();

    let revokedEvent = createRevokedEvent(
      DAO_ADDRESS,
      adminEntityId,
      pluginEntityId,
      AdminPermission
    );

    handleRevoked(revokedEvent);

    assert.entityCount('Administrator', 1);
    // assert.notInStore('AdministratorAdminPlugin', administratorAdminPluginId);
  });
});
