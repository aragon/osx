import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {setupENS} from '../../../utils/ens';

import {ENS_ADDRESSES} from '../../helpers';

// Make sure you own the ENS set in the {{NETWORK}}_ENS_DOMAIN variable in .env
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying framework.`);

  const {network} = hre;

  // Prepare ENS.
  const daoDomain =
    process.env[`${network.name.toUpperCase()}_DAO_ENS_DOMAIN`] || '';
  const pluginDomain =
    process.env[`${network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`] || '';

  if (!daoDomain || !pluginDomain) {
    throw new Error('DAO or Plugin ENS domains have not been set in .env');
  }

  const officialEnsRegistryAddress = ENS_ADDRESSES[network.name];

  if (!officialEnsRegistryAddress) {
    await setupENS([daoDomain, pluginDomain], hre);
  }
};
export default func;
func.tags = ['ENSRegistry'];
