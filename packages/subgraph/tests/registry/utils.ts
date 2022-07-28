import {Address, ethereum} from '@graphprotocol/graph-ts';
import {newMockEvent} from 'matchstick-as/assembly/index';

import {DAORegistered} from '../../generated/DAORegistry/DAORegistry';

// events

export function createNewDaoEvent(
  dao: string,
  creator: string,
  name: string
): DAORegistered {
  let newDaoEvent = changetype<DAORegistered>(newMockEvent());

  newDaoEvent.parameters = [];

  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let creatorParam = new ethereum.EventParam(
    'creator',
    ethereum.Value.fromAddress(Address.fromString(creator))
  );
  let nameParam = new ethereum.EventParam(
    'name',
    ethereum.Value.fromString(name)
  );

  newDaoEvent.parameters.push(daoParam);
  newDaoEvent.parameters.push(creatorParam);
  newDaoEvent.parameters.push(nameParam);

  return newDaoEvent;
}
