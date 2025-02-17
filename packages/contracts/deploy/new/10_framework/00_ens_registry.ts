import {setupENS} from '../../../utils/ens';
import {daoDomainEnv, pluginDomainEnv} from '../../../utils/environment';
import {ENS_ADDRESSES} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

// Make sure you own the ENS set in the {{NETWORK}}_ENS_DOMAIN variable in .env
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying framework.`);

  const {network} = hre;

  const daoDomain = daoDomainEnv(network);
  const pluginDomain = pluginDomainEnv(network);

  const officialEnsRegistryAddress = ENS_ADDRESSES[network.name];

  if (!officialEnsRegistryAddress) {
    await setupENS([daoDomain, pluginDomain], hre);
  }
};
export default func;
func.tags = ['New', 'ENSRegistry', 'Batch-2'];
