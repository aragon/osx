import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {newMockEvent} from 'matchstick-as';

import {
  ProposalCreated,
  ProposalExecuted
} from '../../generated/templates/Admin/Admin';
import {Granted, Revoked} from '../../generated/templates/Admin/DAO';
import {ADDRESS_ZERO} from '../constants';
// events

export function createNewProposalCreatedEvent(
  proposalId: string,
  creator: string,
  startDate: string,
  endDate: string,
  metadata: string,
  actions: ethereum.Tuple[],
  allowFailureMap: string,
  contractAddress: string
): ProposalCreated {
  let createProposalCreatedEvent = changetype<ProposalCreated>(newMockEvent());

  createProposalCreatedEvent.address = Address.fromString(contractAddress);
  createProposalCreatedEvent.parameters = [];

  let proposalIdParam = new ethereum.EventParam(
    'proposalId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(proposalId))
  );
  let creatorParam = new ethereum.EventParam(
    'creator',
    ethereum.Value.fromAddress(Address.fromString(creator))
  );
  let startDateParam = new ethereum.EventParam(
    'startDate',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(startDate))
  );
  let endDateParam = new ethereum.EventParam(
    'endDate',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(endDate))
  );
  let metadataParam = new ethereum.EventParam(
    'metadata',
    ethereum.Value.fromBytes(Bytes.fromUTF8(metadata))
  );
  let actionsParam = new ethereum.EventParam(
    'actions',
    ethereum.Value.fromTupleArray(actions)
  );
  let allowFailureMapParam = new ethereum.EventParam(
    'allowFailureMap',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(allowFailureMap))
  );

  createProposalCreatedEvent.parameters.push(proposalIdParam);
  createProposalCreatedEvent.parameters.push(creatorParam);
  createProposalCreatedEvent.parameters.push(startDateParam);
  createProposalCreatedEvent.parameters.push(endDateParam);
  createProposalCreatedEvent.parameters.push(metadataParam);
  createProposalCreatedEvent.parameters.push(actionsParam);
  createProposalCreatedEvent.parameters.push(allowFailureMapParam);

  return createProposalCreatedEvent;
}

export function createProposalExecutedEvent(
  proposalId: string,
  contractAddress: string
): ProposalExecuted {
  let createProposalExecutedEvent = changetype<ProposalExecuted>(
    newMockEvent()
  );

  createProposalExecutedEvent.address = Address.fromString(contractAddress);
  createProposalExecutedEvent.parameters = [];

  let proposalIdParam = new ethereum.EventParam(
    'proposalId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(proposalId))
  );

  createProposalExecutedEvent.parameters.push(proposalIdParam);

  return createProposalExecutedEvent;
}

export function createGrantedEvent(
  dao: string,
  plugin: string,
  member: string,
  permissionId: string
): Granted {
  let newGrantedEvent = changetype<Granted>(newMockEvent());

  newGrantedEvent.address = Address.fromString(dao);
  newGrantedEvent.parameters = [];

  let permissionIdParam = new ethereum.EventParam(
    'permissionId',
    ethereum.Value.fromBytes(Bytes.fromHexString(permissionId))
  );
  let hereParam = new ethereum.EventParam(
    'here',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let whereParam = new ethereum.EventParam(
    'where',
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );
  let whoParam = new ethereum.EventParam(
    'who',
    ethereum.Value.fromAddress(Address.fromString(member))
  );
  let conditionParam = new ethereum.EventParam(
    'condition',
    ethereum.Value.fromAddress(Address.fromString(ADDRESS_ZERO))
  );

  newGrantedEvent.parameters.push(permissionIdParam);
  newGrantedEvent.parameters.push(hereParam);
  newGrantedEvent.parameters.push(whereParam);
  newGrantedEvent.parameters.push(whoParam);
  newGrantedEvent.parameters.push(conditionParam);

  return newGrantedEvent;
}

export function createRevokedEvent(
  dao: string,
  plugin: string,
  member: string,
  permissionId: string
): Revoked {
  let newRevokedEvent = changetype<Revoked>(newMockEvent());

  newRevokedEvent.address = Address.fromString(dao);
  newRevokedEvent.parameters = [];

  let permissionIdParam = new ethereum.EventParam(
    'permissionId',
    ethereum.Value.fromBytes(Bytes.fromHexString(permissionId))
  );
  let hereParam = new ethereum.EventParam(
    'here',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let whereParam = new ethereum.EventParam(
    'where',
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );
  let whoParam = new ethereum.EventParam(
    'who',
    ethereum.Value.fromAddress(Address.fromString(member))
  );

  newRevokedEvent.parameters.push(permissionIdParam);
  newRevokedEvent.parameters.push(hereParam);
  newRevokedEvent.parameters.push(whereParam);
  newRevokedEvent.parameters.push(whoParam);

  return newRevokedEvent;
}
