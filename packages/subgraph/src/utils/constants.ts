export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

// AS do not support initializing Map with data, a cain of sets is used instead
export const VOTER_STATE = new Map<number, string>()
  .set(0, 'None')
  .set(1, 'Abstain')
  .set(2, 'Yea')
  .set(3, 'Nay');
