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

export const VOTING_EVENTS = {
  VOTE_SETTINGS_UPDATED: 'VoteSettingsUpdated',
  VOTE_CAST: 'VoteCast',
  PROPOSAL_CREATED: 'ProposalCreated',
  PROPOSAL_EXECUTED: 'ProposalExecuted',
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
