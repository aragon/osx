export type AragonPluginRepos = {
  'address-list-voting': {
    address: string;
    blockNumber: number | null;
    transactionHash: string | null;
  };
  'token-voting': {
    address: string;
    blockNumber: number | null;
    transactionHash: string | null;
  };
  admin: {
    address: string;
    blockNumber: number | null;
    transactionHash: string | null;
  };
  multisig: {
    address: string;
    blockNumber: number | null;
    transactionHash: string | null;
  };
  [index: string]: {
    address: string;
    blockNumber: number | null;
    transactionHash: string | null;
  };
};

export type AragonVerifyEntry = {
  contract?: string;
  address: string;
  args?: any[];
};

export enum Operation {
  Grant,
  Revoke,
  GrantWithCondition,
}

/**
 * Represents a testing fork configuration.
 *
 * @network The name of the forked network.
 * @osxVersion The version of OSx at the moment of the fork.
 */
export type TestingFork = {
  network: string;
  osxVersion: string;
  activeContracts: any;
};
