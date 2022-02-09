import {Address, ethereum, Bytes} from '@graphprotocol/graph-ts';
import {newMockEvent} from 'matchstick-as/assembly/index';
import {NewDAORegistered} from '../../generated/Registry/Registry';
import {handleNewDAORegistered} from '../../src/registry';

export function runHandleNewDAORegistered(
  daoAddress: string,
  creator: string,
  token: string,
  daoName: string
): void {
  // create event
  let newDaoEvent = createNewDaoEvent(daoAddress, creator, token, daoName);

  // handle event
  handleNewDAORegistered(newDaoEvent);
}

export function createNewDaoEvent(
  dao: string,
  creator: string,
  token: string,
  name: string
): NewDAORegistered {
  let newDaoEvent = changetype<NewDAORegistered>(newMockEvent());

  newDaoEvent.parameters = new Array();

  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let creatorParam = new ethereum.EventParam(
    'creator',
    ethereum.Value.fromAddress(Address.fromString(creator))
  );
  let tokenParam = new ethereum.EventParam(
    'token',
    ethereum.Value.fromAddress(Address.fromString(token))
  );
  let nameParam = new ethereum.EventParam(
    'name',
    ethereum.Value.fromString(name)
  );

  newDaoEvent.parameters.push(daoParam);
  newDaoEvent.parameters.push(creatorParam);
  newDaoEvent.parameters.push(tokenParam);
  newDaoEvent.parameters.push(nameParam);

  return newDaoEvent;
}
