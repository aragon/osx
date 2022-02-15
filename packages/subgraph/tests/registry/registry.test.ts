import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address} from '@graphprotocol/graph-ts';
import {runHandleNewDAORegistered} from './utils';
import {daoAddress, addressOne, daiAddress} from '../constants';
import {createTokenCalls} from '../utils';

test('Run registry mappings with mock event', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(daoAddress, addressOne, daiAddress, 'mock-Dao');

  let entityID = Address.fromString(daoAddress).toHexString();

  // checks
  assert.fieldEquals('Dao', entityID, 'id', entityID);
  let daoCreator = Address.fromString(addressOne).toHexString();
  assert.fieldEquals('Dao', entityID, 'creator', daoCreator);
  let token = Address.fromString(daiAddress).toHexString();
  assert.fieldEquals('Dao', entityID, 'token', token);
  assert.fieldEquals('Dao', entityID, 'name', 'mock-Dao');

  clearStore();
});
