export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

// AS do not support initializing Map with data, a chain of sets is used instead
export const VOTER_OPTIONS = new Map<number, string>()
  .set(0, 'None')
  .set(1, 'Abstain')
  .set(2, 'Yes')
  .set(3, 'No');

export const VOTE_MODES = new Map<number, string>()
  .set(0, 'Standard')
  .set(1, 'EarlyExecution')
  .set(2, 'VoteReplacement');

export const TOKEN_VOTING_INTERFACE = '0x72a13b7e';
export const ADDRESSLIST_VOTING_INTERFACE = '0x8d8aae2d';
export const ADMIN_INTERFACE = '0x9102c53e';

export const TEN_POWER_16 = '10000000000000000';
