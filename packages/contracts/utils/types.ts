import {HardhatRuntimeEnvironment} from 'hardhat/types';

export type AragonPluginRepos = {
  'address-list-voting': string;
  'token-voting': string;
  admin: string;
  multisig: string;
};

export type EHRE = HardhatRuntimeEnvironment & {
  aragonPluginRepos: AragonPluginRepos;
  managingDAOMultisigPluginAddress: string;
};

export enum Operation {
  Grant,
  Revoke,
  GrantWithCondition,
}
