import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';
import {MultisigProposal} from '../../generated/schema';

import {
  ProposalCreated,
  Approved,
  ProposalExecuted,
  AddressesAdded,
  AddressesRemoved,
  MultisigSettingsUpdated
} from '../../generated/templates/Multisig/Multisig';
import {
  ADDRESS_ONE,
  DAO_ADDRESS,
  PROPOSAL_ENTITY_ID,
  PROPOSAL_ID,
  CONTRACT_ADDRESS,
  SNAPSHOT_BLOCK,
  TOTAL_VOTING_POWER,
  CREATED_AT,
  ONE,
  TWO
} from '../constants';

// events

export function createNewProposalCreatedEvent(
  proposalId: string,
  creator: string,
  metadata: string,
  actions: ethereum.Tuple[],
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
  let metadataParam = new ethereum.EventParam(
    'metadata',
    ethereum.Value.fromBytes(Bytes.fromUTF8(metadata))
  );
  let actionsParam = new ethereum.EventParam(
    'actions',
    ethereum.Value.fromTupleArray(actions)
  );

  createProposalCreatedEvent.parameters.push(proposalIdParam);
  createProposalCreatedEvent.parameters.push(creatorParam);
  createProposalCreatedEvent.parameters.push(metadataParam);
  createProposalCreatedEvent.parameters.push(actionsParam);

  return createProposalCreatedEvent;
}

export function createNewApprovedEvent(
  proposalId: string,
  approver: string,
  contractAddress: string
): Approved {
  let createApprovedEvent = changetype<Approved>(newMockEvent());

  createApprovedEvent.address = Address.fromString(contractAddress);
  createApprovedEvent.parameters = [];

  let proposalIdParam = new ethereum.EventParam(
    'proposalId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(proposalId))
  );
  let approverParam = new ethereum.EventParam(
    'approver',
    ethereum.Value.fromAddress(Address.fromString(approver))
  );

  createApprovedEvent.parameters.push(proposalIdParam);
  createApprovedEvent.parameters.push(approverParam);

  return createApprovedEvent;
}

export function createNewProposalExecutedEvent(
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
  let execResultsParam = new ethereum.EventParam(
    'execResults',
    ethereum.Value.fromBytesArray([Bytes.fromUTF8('')])
  );

  createProposalExecutedEvent.parameters.push(proposalIdParam);
  createProposalExecutedEvent.parameters.push(execResultsParam);

  return createProposalExecutedEvent;
}

export function createNewAddressesAddedEvent(
  addresses: Address[],
  contractAddress: string
): AddressesAdded {
  let newAddressesAddedEvent = changetype<AddressesAdded>(newMockEvent());

  newAddressesAddedEvent.address = Address.fromString(contractAddress);
  newAddressesAddedEvent.parameters = [];

  let usersParam = new ethereum.EventParam(
    'users',
    ethereum.Value.fromAddressArray(addresses)
  );

  newAddressesAddedEvent.parameters.push(usersParam);

  return newAddressesAddedEvent;
}

export function createNewAddressesRemovedEvent(
  addresses: Address[],
  contractAddress: string
): AddressesRemoved {
  let newAddressesRemovedEvent = changetype<AddressesRemoved>(newMockEvent());

  newAddressesRemovedEvent.address = Address.fromString(contractAddress);
  newAddressesRemovedEvent.parameters = [];

  let usersParam = new ethereum.EventParam(
    'users',
    ethereum.Value.fromAddressArray(addresses)
  );

  newAddressesRemovedEvent.parameters.push(usersParam);

  return newAddressesRemovedEvent;
}

export function createNewMultisigSettingsUpdatedEvent(
  onlyListed: boolean,
  minApprovals: string,
  contractAddress: string
): MultisigSettingsUpdated {
  let newProposalSettingsUpdatedEvent = changetype<MultisigSettingsUpdated>(newMockEvent());

  newProposalSettingsUpdatedEvent.address = Address.fromString(contractAddress);
  newProposalSettingsUpdatedEvent.parameters = [];

  let onlyListedParam = new ethereum.EventParam(
    'onlyListed',
    ethereum.Value.fromBoolean(onlyListed)
  );
  let minApprovalsParam = new ethereum.EventParam(
    'minApprovals',
    ethereum.Value.fromString(minApprovals)
  );

  newProposalSettingsUpdatedEvent.parameters.push(onlyListedParam);
  newProposalSettingsUpdatedEvent.parameters.push(minApprovalsParam);

  return newProposalSettingsUpdatedEvent;
}

// calls

export function getProposalCountCall(
  contractAddress: string,
  returns: string
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'proposalCount',
    'proposalCount():(uint256)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromSignedBigInt(BigInt.fromString(returns))]);
}

export function createGetProposalCall(
  contractAddress: string,
  proposalId: string,
  open: boolean,
  executed: boolean,

  minApprovals: string,
  snapshotBlock: string,

  approvals: string,
  addresslistLength: string,

  actions: ethereum.Tuple[]
): void {
  let parameters = new ethereum.Tuple();

  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(minApprovals))
  );
  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(snapshotBlock))
  );

  let tally = new ethereum.Tuple();

  tally.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromString(approvals)));
  tally.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(addresslistLength))
  );

  createMockedFunction(
    Address.fromString(contractAddress),
    'getProposal',
    'getProposal(uint256):(bool,bool,(uint256,uint64),(uint256,uint256),(address,uint256,bytes)[])'
  )
    .withArgs([
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(proposalId))
    ])
    .returns([
      ethereum.Value.fromBoolean(open),
      ethereum.Value.fromBoolean(executed),

      // ProposalParameters
      ethereum.Value.fromTuple(parameters),

      // Tally
      ethereum.Value.fromTuple(tally),

      ethereum.Value.fromTupleArray(actions)
    ]);
}

// state

export function createMultisigProposalEntityState(
  entityID: string = PROPOSAL_ENTITY_ID,
  dao: string = DAO_ADDRESS,
  plugin: string = CONTRACT_ADDRESS,
  creator: string = ADDRESS_ONE,
  proposalId: string = PROPOSAL_ID,
  minApprovals: string = TWO,
  open: boolean = true,
  executed: boolean = false,

  snapshotBlock: string = SNAPSHOT_BLOCK,

  addresslistLength: string = TOTAL_VOTING_POWER,

  createdAt: string = CREATED_AT,
  creationBlockNumber: BigInt = new BigInt(0),
  executable: boolean = false
): MultisigProposal {
  let multisigProposal = new MultisigProposal(entityID);
  multisigProposal.dao = Address.fromString(dao).toHexString();
  multisigProposal.plugin = Address.fromString(plugin).toHexString();
  multisigProposal.proposalId = BigInt.fromString(proposalId);
  multisigProposal.creator = Address.fromString(creator);
  multisigProposal.open = open;
  multisigProposal.executed = executed;
  multisigProposal.snapshotBlock = BigInt.fromString(snapshotBlock);
  multisigProposal.minApprovals = BigInt.fromString(minApprovals);
  multisigProposal.addresslistLength = BigInt.fromString(addresslistLength);
  multisigProposal.createdAt = BigInt.fromString(createdAt);
  multisigProposal.creationBlockNumber = creationBlockNumber;
  multisigProposal.executable = executable;

  multisigProposal.save();

  return multisigProposal;
}
