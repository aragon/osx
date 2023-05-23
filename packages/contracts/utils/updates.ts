export type UpdateInfo = {
  tags: string | string[];
  testForkBlockNumber: number;
};

export const UPDATE_INFOS: {[index: string]: UpdateInfo} = {
  'v1.2.0': {
    tags: 'update/to_v1.2.0',
    testForkBlockNumber: 16722881,
  },
};
