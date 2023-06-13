import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  PluginRepo__factory,
  PluginRepoFactory__factory,
} from '../../../typechain';
import {getContractAddress} from '../../helpers';
import {UPDATE_INFOS} from '../../../utils/updates';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(
    '\nPrepare upgrade action of the "address-list-voting-repo" PluginRepo for the managing DAO'
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
    'address-list-voting-repo',
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

  hre.managingDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Upgrading the address-list-voting-repo implementation contract to ${newPluginRepoImplementation}`,
  });
};
export default func;
func.tags = ['AddresslistVotingPluginRepo'].concat(UPDATE_INFOS['v1_3_0'].tags);
