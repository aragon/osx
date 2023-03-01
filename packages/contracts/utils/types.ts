import {HardhatRuntimeEnvironment} from 'hardhat/types';

export type AragonPluginRepos = {
  'address-list-voting': string;
  'token-voting': string;
  admin: string;
  multisig: string;
};

export type AragonVerifyEntry = {
  address: string;
  args: Array<string | string[] | string[][]>;
};

export type EHRE = HardhatRuntimeEnvironment & {
  aragonPluginRepos: AragonPluginRepos;
  aragonToVerifyContracts: AragonVerifyEntry[];
  managingDAOMultisigPluginAddress: string;
};

export enum Operation {
  Grant,
  Revoke,
  GrantWithCondition,
}
