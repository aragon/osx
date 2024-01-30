import {
  PluginRepo__factory,
  PluginRepoFactory__factory,
} from '../../../typechain';
import {getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

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
    'MultisigRepoProxy',
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

  hre.managementDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Upgrade the <strong>Multisig PluginRepo</strong> (<code>${multisigPluginRepoAddress}</code>) to the new <strong>implementation</strong> (<code>${newPluginRepoImplementation}</code>).`,
  });
};
export default func;
func.tags = ['MultisigPluginRepo', 'v1.3.0'];
