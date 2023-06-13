import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getActiveContractAddress} from '../../helpers';

import pluginRepoFactoryArtifact from '../../../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';
import {PluginRepo__factory} from '../../../typechain';
import {Operation} from '../../../utils/types';
import {UPDATE_INFOS} from '../../../utils/updates';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpdating PluginRepoFactory');
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const managingDAOAddress = await getActiveContractAddress('managingDAO', hre);
  const pluginRepoRegistryAddress = await getActiveContractAddress(
    'PluginRepoRegistry',
    hre
  );
  const previousPluginRepoFactoryAddress = await getActiveContractAddress(
    'PluginRepoFactory',
    hre
  );
  console.log(`Using managingDAO ${managingDAOAddress}`);
  console.log(`Using PluginRepoRegistry ${pluginRepoRegistryAddress}`);
  console.log(
    `Using PreviousPluginRepoFactory ${previousPluginRepoFactoryAddress}`
  );

  const deployResult = await deploy('PluginRepoFactory', {
    contract: pluginRepoFactoryArtifact,
    from: deployer.address,
    args: [pluginRepoRegistryAddress],
    log: true,
  });

  const pluginRepoInterface = PluginRepo__factory.createInterface();
  const calldata = pluginRepoInterface.encodeFunctionData(
    'applyMultiTargetPermissions',
    [
      [
        {
          who: previousPluginRepoFactoryAddress,
          where: pluginRepoRegistryAddress,
          operation: Operation.Revoke,
          permissionId: ethers.utils.id('REGISTER_PLUGIN_REPO_PERMISSION'),
          condition: ethers.constants.AddressZero,
        },
        {
          who: deployResult.address,
          where: pluginRepoRegistryAddress,
          operation: Operation.Grant,
          permissionId: ethers.utils.id('REGISTER_PLUGIN_REPO_PERMISSION'),
          condition: ethers.constants.AddressZero,
        },
      ],
    ]
  );
  // update permissions actions
  hre.managingDAOActions.push({
    to: managingDAOAddress,
    value: 0,
    data: calldata,
    description: `Moves permission (REGISTER_PLUGIN_REPO_PERMISSION) from old PluginRepoFactory ${previousPluginRepoFactoryAddress} to new PluginRepoFactory ${deployResult.address} on PluginRepoRegistry ${pluginRepoRegistryAddress}`,
  });
};
export default func;
func.tags = ['PluginRepoFactory'].concat(UPDATE_INFOS['v1_3_0'].tags);
