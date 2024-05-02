import {BigNumberish, BytesLike} from 'ethers';
import {
  AragonPluginRepos,
  AragonVerifyEntry,
  TestingFork,
} from '../utils/types';
import { Wrapper } from '../test/test-utils/wrapper/Wrapper';

declare module 'hardhat/types' {
  interface HardhatRuntimeEnvironment {
    aragonPluginRepos: AragonPluginRepos;
    aragonToVerifyContracts: AragonVerifyEntry[];
    managingDAOMultisigPluginAddress: string;
    placeholderBuildCIDPath: string;
    managingDAOActions: {
      to: string;
      value: BigNumberish;
      data: BytesLike;
      description: string; // Description to be included in proposal metadata
    }[];
    testingFork: TestingFork;
    wrapper: Wrapper;
  }
}
