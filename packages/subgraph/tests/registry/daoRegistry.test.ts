import {Dao} from '../../generated/schema';
import {handleDAORegistered} from '../../src/registries/daoRegistry';
import {DAO_ADDRESS, ADDRESS_ONE} from '../constants';
import {createNewDaoEvent} from './utils';
import {generateDaoEntityId} from '@aragon/osx-commons-subgraph';
import {Address} from '@graphprotocol/graph-ts';
import {
  assert,
  clearStore,
  test,
  dataSourceMock,
  describe,
  afterEach,
} from 'matchstick-as/assembly/index';

describe('DAORegistry', () => {
  afterEach(() => {
    clearStore();
  });

  test('Run dao registry mappings with mock event', () => {
    // create event
    let newDaoEvent = createNewDaoEvent(DAO_ADDRESS, ADDRESS_ONE, 'mock-Dao');

    // handle event
    handleDAORegistered(newDaoEvent);

    const daoAddress = Address.fromString(DAO_ADDRESS);
    const daoEntityId = generateDaoEntityId(daoAddress);

    // checks
    assert.fieldEquals('Dao', daoEntityId, 'id', daoEntityId);
    assert.fieldEquals(
      'Dao',
      daoEntityId,
      'creator',
      Address.fromString(ADDRESS_ONE).toHexString()
    );
    assert.fieldEquals('Dao', daoEntityId, 'subdomain', 'mock-Dao');
    assert.fieldEquals(
      'Dao',
      daoEntityId,
      'createdAt',
      newDaoEvent.block.timestamp.toString()
    );
    assert.fieldEquals(
      'Dao',
      daoEntityId,
      'txHash',
      newDaoEvent.transaction.hash.toHexString()
    );
  });

  test("Don't store subdomain for blocklisted DAO", () => {
    // Using an already blocklisted address for mainnet. This is unlikely to change
    let denylistedEntityId = '0x16070493aa513f91fc8957f14b7b7c6c0c41fbac';
    // create event.
    let newDaoEvent = createNewDaoEvent(
      denylistedEntityId,
      ADDRESS_ONE,
      'mock-Dao'
    );
    dataSourceMock.setNetwork('mainnet');

    handleDAORegistered(newDaoEvent);

    // checks
    assert.fieldEquals('Dao', denylistedEntityId, 'id', denylistedEntityId);
    assert.fieldEquals(
      'Dao',
      denylistedEntityId,
      'creator',
      Address.fromString(ADDRESS_ONE).toHexString()
    );
    assert.fieldEquals(
      'Dao',
      denylistedEntityId,
      'createdAt',
      newDaoEvent.block.timestamp.toString()
    );
    assert.fieldEquals(
      'Dao',
      denylistedEntityId,
      'txHash',
      newDaoEvent.transaction.hash.toHexString()
    );

    const daoEntity = Dao.load(denylistedEntityId);
    assert.assertNull(daoEntity!.subdomain);
  });
});
