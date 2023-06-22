export type AragonPluginRepos = {
  'address-list-voting': string;
  'token-voting': string;
  // prettier-ignore
  'admin': string;
  // prettier-ignore
  'multisig': string;
  [index: string]: string;
};

export type AragonVerifyEntry = {
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
