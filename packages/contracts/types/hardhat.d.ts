import {AragonPluginRepos, AragonVerifyEntry} from '../utils/types';

declare module 'hardhat/types' {
  interface HardhatRuntimeEnvironment {
    aragonPluginRepos: AragonPluginRepos;
    aragonToVerifyContracts: AragonVerifyEntry[];
    managingDAOMultisigPluginAddress: string;
    placeholderBuildCIDPath: string;
  }
}
