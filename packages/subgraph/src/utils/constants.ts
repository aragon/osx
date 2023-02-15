export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

// AS do not support initializing Map with data, a chain of sets is used instead
export const VOTER_OPTIONS = new Map<number, string>()
  .set(0, 'None')
  .set(1, 'Abstain')
  .set(2, 'Yes')
  .set(3, 'No');

export const VOTING_MODES = new Map<number, string>()
  .set(0, 'Standard')
  .set(1, 'EarlyExecution')
  .set(2, 'VoteReplacement');

export const TOKEN_VOTING_INTERFACE = '0xe28c3b19';
export const ADDRESSLIST_VOTING_INTERFACE = '0x9e66ca85';
export const ADMIN_INTERFACE = '0x61af5ebe';
export const MULTISIG_INTERFACE = '0x29d59862';

export const RATIO_BASE = '1000000'; // 10**6
