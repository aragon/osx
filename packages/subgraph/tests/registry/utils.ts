import {Address, ethereum} from '@graphprotocol/graph-ts';
import {newMockEvent} from 'matchstick-as/assembly/index';

import {DAORegistered} from '../../generated/DAORegistry/DAORegistry';
import {PluginRepoRegistered} from '../../generated/PluginRepoRegistry/PluginRepoRegistry';

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

export function createPluginRepoRegisteredEvent(
  name: string,
  pluginRepo: string
): PluginRepoRegistered {
  let newPluginRepo = changetype<PluginRepoRegistered>(newMockEvent());

  newPluginRepo.parameters = [];

  let nameParam = new ethereum.EventParam(
    'name',
    ethereum.Value.fromString(name)
  );

  let pluginRepoParam = new ethereum.EventParam(
    'pluginRepo',
    ethereum.Value.fromAddress(Address.fromString(pluginRepo))
  );

  newPluginRepo.parameters.push(nameParam);
  newPluginRepo.parameters.push(pluginRepoParam);

  return newPluginRepo;
}
