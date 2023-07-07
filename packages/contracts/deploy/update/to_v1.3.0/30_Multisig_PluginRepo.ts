import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  PluginRepo__factory,
  PluginRepoFactory__factory,
} from '../../../typechain';
import {getContractAddress} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(
    '\nUpgrade the `multisig-repo` PluginRepo to the new implementation'
  );

  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );
  const newPluginRepoImplementation = await PluginRepoFactory__factory.connect(
    pluginRepoFactoryAddress,
    hre.ethers.provider
  ).pluginRepoBase();

  const multisigPluginRepoAddress = await getContractAddress(
    'multisig-repo',
    hre
  );
  const multisigPluginRepo = PluginRepo__factory.connect(
    multisigPluginRepoAddress,
    hre.ethers.provider
  );
  const upgradeTX = await multisigPluginRepo.populateTransaction.upgradeTo(
    newPluginRepoImplementation
  );

  if (!upgradeTX.to || !upgradeTX.data) {
    throw new Error(`Failed to populate upgradeTo transaction`);
  }

  hre.managingDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Upgrade the "multisig-repo" PluginRepo (${multisigPluginRepoAddress}) to the new implementation (${newPluginRepoImplementation})`,
  });
};
export default func;
func.tags = ['MultisigPluginRepo', 'v1.3.0'];
