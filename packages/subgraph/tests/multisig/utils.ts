import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';
import {MultisigProposal} from '../../generated/schema';

import {
  ProposalCreated,
  Approved,
  ProposalExecuted,
  IndividualMembershipAnnounced,
  IndividualMembershipRenounced,
  MultisigSettingsUpdated
} from '../../generated/templates/Multisig/Multisig';
import {
  ADDRESS_ONE,
  DAO_ADDRESS,
  PROPOSAL_ENTITY_ID,
  PROPOSAL_ID,
  CONTRACT_ADDRESS,
  SNAPSHOT_BLOCK,
  CREATED_AT,
  TWO,
  START_DATE,
  END_DATE
} from '../constants';

// events

export function createNewProposalCreatedEvent(
  proposalId: string,
  creator: string,
  startDate: string,
  endDate: string,
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

  createProposalCreatedEvent.parameters.push(proposalIdParam);
  createProposalCreatedEvent.parameters.push(creatorParam);
  createProposalCreatedEvent.parameters.push(startDateParam);
  createProposalCreatedEvent.parameters.push(endDateParam);
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

export function createNewIndividualMembershipAnnouncedEvent(
  addresses: Address[],
  contractAddress: string
): IndividualMembershipAnnounced {
  let newIndividualMembershipAnnouncedEvent = changetype<
    IndividualMembershipAnnounced
  >(newMockEvent());

  newIndividualMembershipAnnouncedEvent.address = Address.fromString(
    contractAddress
  );
  newIndividualMembershipAnnouncedEvent.parameters = [];

  let usersParam = new ethereum.EventParam(
    'users',
    ethereum.Value.fromAddressArray(addresses)
  );

  newIndividualMembershipAnnouncedEvent.parameters.push(usersParam);

  return newIndividualMembershipAnnouncedEvent;
}

export function createNewIndividualMembershipRenouncedEvent(
  addresses: Address[],
  contractAddress: string
): IndividualMembershipRenounced {
  let newIndividualMembershipRenouncedEvent = changetype<
    IndividualMembershipRenounced
  >(newMockEvent());

  newIndividualMembershipRenouncedEvent.address = Address.fromString(
    contractAddress
  );
  newIndividualMembershipRenouncedEvent.parameters = [];

  let usersParam = new ethereum.EventParam(
    'users',
    ethereum.Value.fromAddressArray(addresses)
  );

  newIndividualMembershipRenouncedEvent.parameters.push(usersParam);

  return newIndividualMembershipRenouncedEvent;
}

export function createNewMultisigSettingsUpdatedEvent(
  onlyListed: boolean,
  minApprovals: string,
  contractAddress: string
): MultisigSettingsUpdated {
  let newProposalSettingsUpdatedEvent = changetype<MultisigSettingsUpdated>(
    newMockEvent()
  );

  newProposalSettingsUpdatedEvent.address = Address.fromString(contractAddress);
  newProposalSettingsUpdatedEvent.parameters = [];

  let onlyListedParam = new ethereum.EventParam(
    'onlyListed',
    ethereum.Value.fromBoolean(onlyListed)
  );

  let minApprovalsParam = new ethereum.EventParam(
    'minApprovals',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(minApprovals))
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
  executed: boolean,

  startDate: string,
  endDate: string,
  minApprovals: string,
  snapshotBlock: string,

  approvals: string,

  actions: ethereum.Tuple[]
): void {
  let parameters = new ethereum.Tuple();

  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(minApprovals))
  );
  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(snapshotBlock))
  );
  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(startDate))
  );
  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(endDate))
  );

  createMockedFunction(
    Address.fromString(contractAddress),
    'getProposal',
    'getProposal(uint256):(bool,uint32,(uint16,uint64,uint64,uint64),(address,uint256,bytes)[])'
  )
    .withArgs([
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(proposalId))
    ])
    .returns([
      ethereum.Value.fromBoolean(executed),

      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(approvals)),

      // ProposalParameters
      ethereum.Value.fromTuple(parameters),

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
  startDate: string = START_DATE,
  endDate: string = END_DATE,
  executed: boolean = false,

  snapshotBlock: string = SNAPSHOT_BLOCK,

  createdAt: string = CREATED_AT,
  creationBlockNumber: BigInt = new BigInt(0)
): MultisigProposal {
  let multisigProposal = new MultisigProposal(entityID);
  multisigProposal.dao = Address.fromString(dao).toHexString();
  multisigProposal.plugin = Address.fromString(plugin).toHexString();
  multisigProposal.proposalId = BigInt.fromString(proposalId);
  multisigProposal.creator = Address.fromString(creator);
  multisigProposal.startDate = BigInt.fromString(startDate);
  multisigProposal.endDate = BigInt.fromString(endDate);
  multisigProposal.executed = executed;
  multisigProposal.snapshotBlock = BigInt.fromString(snapshotBlock);
  multisigProposal.minApprovals = BigInt.fromString(minApprovals);
  multisigProposal.createdAt = BigInt.fromString(createdAt);
  multisigProposal.creationBlockNumber = creationBlockNumber;

  multisigProposal.save();

  return multisigProposal;
}
