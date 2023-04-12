import {
  assert,
  clearStore,
  dataSourceMock,
  test,
  describe,
  beforeEach,
  afterEach
} from 'matchstick-as/assembly/index';

import {ADDRESS_ONE, ADDRESS_TWO, DAO_ADDRESS} from '../constants';
import {createGrantedEvent, createRevokedEvent} from './utils';
import {
  handleGranted,
  handleRevoked
} from '../../src/packages/admin/adminMembers';
import {DataSourceContext} from '@graphprotocol/graph-ts';
import {Administrator, AdministratorAdminPlugin} from '../../generated/schema';

describe('AdminMembers', function() {
  // keccack256 of EXECUTE_PROPOSAL_PERMISSION
  const AdminPermission =
    '0xf281525e53675515a6ba7cc7bea8a81e649b3608423ee2d73be1752cea887889';

  beforeEach(function() {
    let context = new DataSourceContext();
    context.setString('permissionId', AdminPermission);
    context.setString('pluginAddress', ADDRESS_ONE);
    dataSourceMock.setContext(context);
  });

  afterEach(function() {
    clearStore();
  });

  test('handleGranted', function() {
    let event = createGrantedEvent(
      DAO_ADDRESS,
      ADDRESS_ONE,
      ADDRESS_TWO,
      AdminPermission
    );
    handleGranted(event);

    assert.entityCount('Administrator', 1);
    assert.fieldEquals('Administrator', ADDRESS_TWO, 'id', ADDRESS_TWO);
    assert.fieldEquals('Administrator', ADDRESS_TWO, 'address', ADDRESS_TWO);

    assert.entityCount('AdministratorAdminPlugin', 1);

    let administratorAdminPluginId = `${ADDRESS_ONE}_${ADDRESS_TWO}`;
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
      ADDRESS_TWO
    );
    assert.fieldEquals(
      'AdministratorAdminPlugin',
      administratorAdminPluginId,
      'plugin',
      ADDRESS_ONE
    );
  });

  test('handleRevoked', function() {
    let administrator = new Administrator(ADDRESS_TWO);
    administrator.address = ADDRESS_TWO;
    administrator.save();

    let administratorAdminPluginId = `${ADDRESS_ONE}_${ADDRESS_TWO}`;
    let administratorAdminPluginEntity = new AdministratorAdminPlugin(
      administratorAdminPluginId
    );
    administratorAdminPluginEntity.administrator = ADDRESS_TWO;
    administratorAdminPluginEntity.plugin = ADDRESS_ONE;
    administratorAdminPluginEntity.save();

    let revokedEvent = createRevokedEvent(
      DAO_ADDRESS,
      ADDRESS_ONE,
      ADDRESS_TWO,
      AdminPermission
    );

    handleRevoked(revokedEvent);

    assert.entityCount('Administrator', 1);
    assert.notInStore('AdministratorAdminPlugin', administratorAdminPluginId);
  });
});
