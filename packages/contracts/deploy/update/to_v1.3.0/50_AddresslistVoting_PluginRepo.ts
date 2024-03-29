import {
  PluginRepo__factory,
  PluginRepoFactory__factory,
} from '../../../typechain';
import {getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(
    '\nUpgrade the `address-list-voting-repo` PluginRepo to the new implementation'
  );

  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );
  const newPluginRepoImplementation = await PluginRepoFactory__factory.connect(
    pluginRepoFactoryAddress,
    hre.ethers.provider
  ).pluginRepoBase();

  const addresslistVotingPluginRepoAddress = await getContractAddress(
    'AddresslistVotingRepoProxy',
    hre
  );
  const addresslistVotingPluginRepo = PluginRepo__factory.connect(
    addresslistVotingPluginRepoAddress,
    hre.ethers.provider
  );
  const upgradeTX =
    await addresslistVotingPluginRepo.populateTransaction.upgradeTo(
      newPluginRepoImplementation
    );

  if (!upgradeTX.to || !upgradeTX.data) {
    throw new Error(`Failed to populate upgradeTo transaction`);
  }

  hre.managementDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Upgrade the <strong>Addresslist PluginRepo</strong> (<code>${addresslistVotingPluginRepoAddress}</code>) to the new <strong>implementation</strong> (<code>${newPluginRepoImplementation}</code>).`,
  });
};
export default func;
func.tags = ['AddresslistVotingPluginRepo', 'v1.3.0'];
