import {BigNumberish, BytesLike} from 'ethers';

import {Wrapper} from '../test/test-utils/wrapper';
import { HardhatRuntimeEnvironment } from 'hardhat/types';


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
    aragonToVerifyContracts: AragonVerifyEntry[];
    managementDAOMultisigPluginAddress: string;
    placeholderBuildCIDPath: string;
    proposalInfo: {
      proposalTitle: string;
      proposalSummary: string;
      proposalResources: {
        name: string;
        url: string;
      }[];
      proposalStartDate: number;
      proposalEndDate: number;
    };
    managementDAOActions: {
      to: string;
      value: BigNumberish;
      data: BytesLike;
      description: string; // Description to be included in proposal metadata
    }[];
    wrapper: Wrapper;
    testingFork: TestingFork;
  }
}