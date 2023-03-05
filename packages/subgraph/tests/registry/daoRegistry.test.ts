import {
  assert,
  clearStore,
  test,
  dataSourceMock,
  describe,
  afterEach
} from 'matchstick-as/assembly/index';
import {Address} from '@graphprotocol/graph-ts';

import {handleDAORegistered} from '../../src/registries/daoRegistry';
import {DAO_ADDRESS, ADDRESS_ONE} from '../constants';
import {createNewDaoEvent} from './utils';
import {Dao} from '../../generated/schema';

describe('DAORegistry', () => {
  afterEach(() => {
    clearStore();
  });

  test('Run dao registry mappings with mock event', () => {
    // create event
    let newDaoEvent = createNewDaoEvent(DAO_ADDRESS, ADDRESS_ONE, 'mock-Dao');

    // handle event
    handleDAORegistered(newDaoEvent);

    let entityID = Address.fromString(DAO_ADDRESS).toHexString();

    // checks
    assert.fieldEquals('Dao', entityID, 'id', entityID);
    assert.fieldEquals(
      'Dao',
      entityID,
      'creator',
      Address.fromString(ADDRESS_ONE).toHexString()
    );
    assert.fieldEquals('Dao', entityID, 'subdomain', 'mock-Dao');
    assert.fieldEquals(
      'Dao',
      entityID,
      'createdAt',
      newDaoEvent.block.timestamp.toString()
    );
  });

  test("Don't store subdomain for blocklisted DAO", () => {
    // Using an already blocklisted address for mainnet. This is unlikely to change
    let entityID = '0x16070493aa513f91fc8957f14b7b7c6c0c41fbac';
    // create event.
    let newDaoEvent = createNewDaoEvent(entityID, ADDRESS_ONE, 'mock-Dao');
    dataSourceMock.setNetwork('mainnet');

    handleDAORegistered(newDaoEvent);

    // checks
    assert.fieldEquals('Dao', entityID, 'id', entityID);
    assert.fieldEquals(
      'Dao',
      entityID,
      'creator',
      Address.fromString(ADDRESS_ONE).toHexString()
    );
    assert.fieldEquals(
      'Dao',
      entityID,
      'createdAt',
      newDaoEvent.block.timestamp.toString()
    );

    const daoEntity = Dao.load(entityID);
    assert.assertNull(daoEntity!.subdomain);
  });
});
