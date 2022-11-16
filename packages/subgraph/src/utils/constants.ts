export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

// AS do not support initializing Map with data, a cain of sets is used instead
export const VOTER_STATE = new Map<number, string>()
  .set(0, 'None')
  .set(1, 'Abstain')
  .set(2, 'Yes')
  .set(3, 'No');

export const ERC20_VOTING_INTERFACE = '0x72a13b7e';
export const ADDRESSLIST_VOTING_INTERFACE = '0x8d8aae2d';
export const TEN_POWER_16 = '10000000000000000';
