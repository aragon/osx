import {
  PluginRepo__factory,
  PluginRepoFactory__factory,
} from '../../../typechain';
import {getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(
    '\nUpgrade the `token-voting-repo` PluginRepo to the new implementation'
  );

  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );
  const newPluginRepoImplementation = await PluginRepoFactory__factory.connect(
    pluginRepoFactoryAddress,
    hre.ethers.provider
  ).pluginRepoBase();

  const tokenVotingPluginRepoAddress = await getContractAddress(
    'TokenVotingRepoProxy',
    hre
  );
  const tokenVotingPluginRepo = PluginRepo__factory.connect(
    tokenVotingPluginRepoAddress,
    hre.ethers.provider
  );
  const upgradeTX = await tokenVotingPluginRepo.populateTransaction.upgradeTo(
    newPluginRepoImplementation
  );

  if (!upgradeTX.to || !upgradeTX.data) {
    throw new Error(`Failed to populate upgradeTo transaction`);
  }

  hre.managementDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Upgrade the <strong>TokenVoting PluginRepo</strong> (<code>${tokenVotingPluginRepoAddress}</code>) to the new <strong>implementation</strong> (<code>${newPluginRepoImplementation}</code>).`,
  });
};
export default func;
func.tags = ['TokenVotingPluginRepo', 'v1.3.0'];
