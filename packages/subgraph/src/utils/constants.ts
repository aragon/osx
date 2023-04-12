export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

// AS do not support initializing Map with data, a chain of sets is used instead
export const VOTER_OPTIONS = new Map<number, string>()
  .set(0, 'None')
  .set(1, 'Abstain')
  .set(2, 'Yes')
  .set(3, 'No');

export const VOTE_OPTIONS = new Map<string, string>()
  .set('None', '0')
  .set('Abstain', '1')
  .set('Yes', '2')
  .set('No', '3');

export const VOTING_MODES = new Map<number, string>()
  .set(0, 'Standard')
  .set(1, 'EarlyExecution')
  .set(2, 'VoteReplacement');

export const VOTING_MODE_INDEXES = new Map<string, string>()
  .set('Standard', '0')
  .set('EarlyExecution', '1')
  .set('VoteReplacement', '2');

export const TOKEN_VOTING_INTERFACE = '0x50eb001e';
export const ADDRESSLIST_VOTING_INTERFACE = '0x5f21eb8b';
export const ADMIN_INTERFACE = '0xa5793356';
export const MULTISIG_INTERFACE = '0x8f852786';

export const RATIO_BASE = '1000000'; // 10**6
