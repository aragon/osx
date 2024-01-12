import {BigNumberish, BytesLike} from 'ethers';
import {
  AragonPluginRepos,
  AragonVerifyEntry,
  TestingFork,
} from '../utils/types';

declare module 'hardhat/types' {
  interface HardhatRuntimeEnvironment {
    aragonPluginRepos: AragonPluginRepos;
    aragonToVerifyContracts: AragonVerifyEntry[];
    managingDAOMultisigPluginAddress: string;
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
