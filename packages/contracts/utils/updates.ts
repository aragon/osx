export type UpdateInfo = {
  tags: string | string[];
  forkBlockNumber: number;
};

export const UPDATE_INFOS: {[index: string]: UpdateInfo} = {
  v1_2_0: {
    tags: 'update/to_v1.2.0',
    forkBlockNumber: 16722881,
  },
};
