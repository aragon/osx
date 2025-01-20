import pluginRepoFactoryArtifact from '../../../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';
import {PluginRepo__factory} from '../../../typechain';
import {getLatestContractAddress} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpdating PluginRepoFactory');
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const managementDAOAddress = getLatestContractAddress(
    'ManagementDAOProxy',
    hre
  );
  const pluginRepoRegistryAddress = getLatestContractAddress(
    'PluginRepoRegistryProxy',
    hre
  );
  const previousPluginRepoFactoryAddress = getLatestContractAddress(
    'PluginRepoFactory',
    hre
  );
  console.log(`Using managementDAO ${managementDAOAddress}`);
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
  hre.managementDAOActions.push({
    to: managementDAOAddress,
    value: 0,
    data: calldata,
    description: `Moves the <strong>REGISTER_PLUGIN_REPO_PERMISSION</strong> permission on the <strong>PluginRepoRegistry</strong> (<code>${pluginRepoRegistryAddress}</code>) from the old <strong>PluginRepoFactory</strong> (<code>${previousPluginRepoFactoryAddress}</code>) to the new <strong>PluginRepoFactory</strong> (<code>${deployResult.address}</code>).`,
  });
};
export default func;
func.tags = ['PluginRepoFactory', 'v1.4.0'];
