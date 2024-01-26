import {Address, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {newMockEvent} from 'matchstick-as';

export function createNewGrantedEvent<T>(
  contractPermissionId: Bytes,
  actor: string,
  where: string,
  who: string,
  condition: string,
  contractAddress: string
): T {
  let newGrantedEvent = changetype<T>(newMockEvent());

  newGrantedEvent.address = Address.fromString(contractAddress);
  newGrantedEvent.parameters = [];

  let contractPermissionIdParam = new ethereum.EventParam(
    'contractPermissionId',
    ethereum.Value.fromBytes(contractPermissionId)
  );
  let actorParam = new ethereum.EventParam(
    'actor',
    ethereum.Value.fromAddress(Address.fromString(actor))
  );
  let whereParam = new ethereum.EventParam(
    'where',
    ethereum.Value.fromAddress(Address.fromString(where))
  );
  let whoParam = new ethereum.EventParam(
    'who',
    ethereum.Value.fromAddress(Address.fromString(who))
  );
  let conditionParam = new ethereum.EventParam(
    'condition',
    ethereum.Value.fromAddress(Address.fromString(condition))
  );

  newGrantedEvent.parameters.push(contractPermissionIdParam);
  newGrantedEvent.parameters.push(actorParam);
  newGrantedEvent.parameters.push(whereParam);
  newGrantedEvent.parameters.push(whoParam);
  newGrantedEvent.parameters.push(conditionParam);

  return newGrantedEvent as T;
}

export function createNewRevokedEvent<T>(
  contractPermissionId: Bytes,
  actor: string,
  where: string,
  who: string,
  contractAddress: string
): T {
  let newGrantedEvent = changetype<T>(newMockEvent());

  newGrantedEvent.address = Address.fromString(contractAddress);
  newGrantedEvent.parameters = [];

  let contractPermissionIdParam = new ethereum.EventParam(
    'contractPermissionId',
    ethereum.Value.fromBytes(contractPermissionId)
  );
  let actorParam = new ethereum.EventParam(
    'actor',
    ethereum.Value.fromAddress(Address.fromString(actor))
  );
  let whereParam = new ethereum.EventParam(
    'where',
    ethereum.Value.fromAddress(Address.fromString(where))
  );
  let whoParam = new ethereum.EventParam(
    'who',
    ethereum.Value.fromAddress(Address.fromString(who))
  );

  newGrantedEvent.parameters.push(contractPermissionIdParam);
  newGrantedEvent.parameters.push(actorParam);
  newGrantedEvent.parameters.push(whereParam);
  newGrantedEvent.parameters.push(whoParam);

  return newGrantedEvent as T;
}
