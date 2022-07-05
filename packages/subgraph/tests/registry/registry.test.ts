import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address} from '@graphprotocol/graph-ts';

import {handleNewDAORegistered} from '../../src/registry';
import {DAO_ADDRESS, ADDRESS_ONE, DAO_TOKEN_ADDRESS} from '../constants';
import {createTokenCalls} from '../utils';
import {createNewDaoEvent} from './utils';

test('Run registry mappings with mock event', () => {
  // create calls
  createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');

  // create event
  let newDaoEvent = createNewDaoEvent(
    DAO_ADDRESS,
    ADDRESS_ONE,
    DAO_TOKEN_ADDRESS,
    'mock-Dao'
  );

  // handle event
  handleNewDAORegistered(newDaoEvent);

  let entityID = Address.fromString(DAO_ADDRESS).toHexString();

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
    'token',
    Address.fromString(DAO_TOKEN_ADDRESS).toHexString()
  );
  assert.fieldEquals('Dao', entityID, 'name', 'mock-Dao');

  clearStore();
});
