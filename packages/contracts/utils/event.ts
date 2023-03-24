import {ContractTransaction} from 'ethers';

export async function findEvent<T>(tx: ContractTransaction, eventName: string) {
  const receipt = await tx.wait();
  const event = (receipt.events || []).find(event => event.event === eventName);

  return event as T | undefined;
}

export async function filterEvents(tx: any, eventName: string) {
  const {events} = await tx.wait();
  const event = events.filter(({event}: {event: any}) => event === eventName);

  return event;
}

export const PROPOSAL_EVENTS = {
  PROPOSAL_CREATED: 'ProposalCreated',
  PROPOSAL_EXECUTED: 'ProposalExecuted',
};

export const VOTING_EVENTS = {
  VOTING_SETTINGS_UPDATED: 'VotingSettingsUpdated',
  VOTE_CAST: 'VoteCast',
};

export const MULTISIG_EVENTS = {
  MULTISIG_SETTINGS_UPDATED: 'MultisigSettingsUpdated',
  APPROVED: 'Approved',
};

export const DAO_EVENTS = {
  METADATA_SET: 'MetadataSet',
  EXECUTED: 'Executed',
  DEPOSITED: 'Deposited',
  STANDARD_CALLBACK_REGISTERED: 'StandardCallbackRegistered',
  TRUSTED_FORWARDER_SET: 'TrustedForwarderSet',
  SIGNATURE_VALIDATOR_SET: 'SignatureValidatorSet',
  NEW_URI: 'NewURI',
};

export const MEMBERSHIP_EVENTS = {
  MEMBERS_ADDED: 'MembersAdded',
  MEMBERS_REMOVED: 'MembersRemoved',
  MEMBERSHIP_CONTRACT_ANNOUNCED: 'MembershipContractAnnounced',
};
