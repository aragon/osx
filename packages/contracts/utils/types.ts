import {HardhatRuntimeEnvironment} from 'hardhat/types';

export type AragonPluginRepos = {
  'address-list-voting': string;
  'token-voting': string;
  // prettier-ignore
  'admin': string;
  // prettier-ignore
  'multisig': string;
};

export type AragonVerifyEntry = {
  address: string;
  args: Array<string | string[] | string[][]>;
};

export type EHRE = HardhatRuntimeEnvironment & {
  aragonPluginRepos: AragonPluginRepos;
  aragonToVerifyContracts: AragonVerifyEntry[];
  managingDAOMultisigPluginAddress: string;
  placeholderBuildCIDPath: string;
};

export enum Operation {
  Grant,
  Revoke,
  GrantWithCondition,
}
