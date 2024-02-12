import {BigNumberish, BytesLike} from 'ethers';

export type AragonPluginRepos = {
  AddresslistVotingRepoProxy: string;
  TokenVotingRepoProxy: string;
  AdminRepoProxy: string;
  MultisigRepoProxy: string;
  // DEPRECATED KEYS
  // 'address-list-voting': string;
  // 'token-voting': string;
  // // prettier-ignore
  // 'admin': string;
  // // prettier-ignore
  // 'multisig': string;
  [index: string]: string;
};

export type AragonVerifyEntry = {
  contract?: string;
  address: string;
  args?: any[];
};

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

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    aragonPluginRepos: AragonPluginRepos;
    aragonToVerifyContracts: AragonVerifyEntry[];
    managementDAOMultisigPluginAddress: string;
    placeholderBuildCIDPath: string;
    managementDAOActions: {
      to: string;
      value: BigNumberish;
      data: BytesLike;
      description: string; // Description to be included in proposal metadata
    }[];
    testingFork: TestingFork;
  }
}
