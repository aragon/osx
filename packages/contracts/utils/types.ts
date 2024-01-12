export type AragonPluginRepos = {
  AddresslistVotingRepoProxy: string;
  TokenVotingRepoProxy: string;
  AdminRepoProxy: string;
  MultisigRepoProxy: string;
  [index: string]: string;
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
