export type UpdateInfo = {
  tags: string | string[];
  forkBlockNumber: number;
};

export const UPDATE_INFOS: {[index: string]: UpdateInfo} = {
  v1_3_0: {
    tags: 'update/to_v1.3.0',
    forkBlockNumber: 16722881,
  },
};
