import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress, skipIfNotZkSync} from '../../helpers';

import pluginSetupProcessorUpgradeableFactoryArtifact from '../../../artifacts/src/zksync/PluginSetupProcessorUpgradeable.sol/PluginSetupProcessorUpgradeable.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Get `PluginRepoRegistry` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistry',
    hre
  );

  // Get `Management DAO` address.
  const managementDAOAddress = await getContractAddress('DAO', hre);

  await deploy('PluginSetupProcessorUpgradeable', {
    contract: pluginSetupProcessorUpgradeableFactoryArtifact,
    from: deployer.address,
    args: [],
    log: true,
    proxy: {
      owner: deployer.address,
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [managementDAOAddress, pluginRepoRegistryAddress],
        },
      },
    },
  });
};

export default func;
func.tags = ['New', 'PluginSetupProcessorUpgradeable'];
func.skip = async hre =>
  await skipIfNotZkSync(hre, 'PluginSetupProcessorUpgradeable');
