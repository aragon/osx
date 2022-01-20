// AS do not support initializing Map with data, we use a cain of sets instead
export const EXECUTION_STATES = new Map<number, string>()
  .set(0, 'RUNNING')
  .set(1, 'STOPPED')
  .set(2, 'HALTED')
  .set(3, 'EXECUTED');
