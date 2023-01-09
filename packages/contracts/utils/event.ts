import {expect} from 'chai';

export async function findEvent(tx: any, eventName: string) {
  const {events} = await tx.wait();
  const event = events.find(({event}: {event: any}) => event === eventName);

  return event;
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
  WITHDRAWN: 'Withdrawn',
  STANDARD_CALLBACK_REGISTERED: 'StandardCallbackRegistered',
  TRUSTED_FORWARDER_SET: 'TrustedForwarderSet',
  SIGNATURE_VALIDATOR_SET: 'SignatureValidatorSet',
};

export const ADDRESSLIST_EVENTS = {
  ADDRESSES_ADDED: 'AddressesAdded',
  ADDRESSES_REMOVED: 'AddressesRemoved',
};
