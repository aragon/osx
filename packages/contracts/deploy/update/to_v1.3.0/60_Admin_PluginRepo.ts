import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  PluginRepo__factory,
  PluginRepoFactory__factory,
} from '../../../typechain';
import {getContractAddress, skipIfZkSync} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(
    '\nUpgrade the `admin-repo` PluginRepo to the new implementation'
  );

  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );
  const newPluginRepoImplementation = await PluginRepoFactory__factory.connect(
    pluginRepoFactoryAddress,
    hre.ethers.provider
  ).pluginRepoBase();

  const adminPluginRepoAddress = await getContractAddress('admin-repo', hre);
  const adminPluginRepo = PluginRepo__factory.connect(
    adminPluginRepoAddress,
    hre.ethers.provider
  );
  const upgradeTX = await adminPluginRepo.populateTransaction.upgradeTo(
    newPluginRepoImplementation
  );

  if (!upgradeTX.to || !upgradeTX.data) {
    throw new Error(`Failed to populate upgradeTo transaction`);
  }

  hre.managingDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Upgrade the "admin-repo" PluginRepo (${adminPluginRepo}) to the new implementation (${newPluginRepoImplementation})`,
  });
};
export default func;
func.tags = ['AdminPluginRepo', 'v1.3.0'];
func.skip = async hre => await skipIfZkSync(hre, 'UpdateAdminPluginRepo');
