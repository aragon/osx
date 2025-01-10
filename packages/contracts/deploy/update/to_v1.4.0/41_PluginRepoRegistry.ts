import pluginRepoRegistryArtifact from '../../../artifacts/src/framework/plugin/repo/PluginRepoRegistry.sol/PluginRepoRegistry.json';
import {
  DAOFactory__factory,
  DAORegistry__factory,
  DAO__factory,
  PluginRepoRegistry__factory,
} from '../../../typechain';
import {DAORegistry} from '../../../typechain/@aragon/osx-v1.0.1/framework/dao/DAORegistry.sol';
import {getContractAddress} from '../../helpers';
import {getProtocolVersion} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpgrade the pluginRepoRegistry to new Implementation');

  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistryProxy',
    hre
  );
  const pluginRepoRegistry = PluginRepoRegistry__factory.connect(
    pluginRepoRegistryAddress,
    hre.ethers.provider
  );

  const result = await deploy('PluginRepoRegistryImplementation', {
    contract: pluginRepoRegistryArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });

  const upgradeTX = await pluginRepoRegistry.populateTransaction.upgradeTo(
    result.address
  );

  if (!upgradeTX.to || !upgradeTX.data) {
    throw new Error(`Failed to populate upgradeToAndCall transaction`);
  }

  hre.managementDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Upgrade the <strong>PluginRepoRegistry </strong> (<code>${pluginRepoRegistryAddress}</code>) to the new <strong>implementation</strong> (<code>${result.address}</code>).`,
  });
};
export default func;
func.tags = ['PluginRepoRegistry', 'v1.4.0'];
