import daoFactoryArtifact from '../../../artifacts/src/framework/dao/DAOFactory.sol/DAOFactory.json';
import {DAO__factory} from '../../../typechain';
import {Operation} from '../../../utils/types';
import {getActiveContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpdating DAOFactory');
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const managingDAOAddress = await getActiveContractAddress('managingDAO', hre);
  const pluginSetupProcessorAddress = await getActiveContractAddress(
    'PluginSetupProcessor',
    hre
  );
  const daoRegistryAddress = await getActiveContractAddress('DAORegistry', hre);
  const previousDAOFactoryAddress = await getActiveContractAddress(
    'DAOFactory',
    hre
  );
  console.log(`Using managingDAO ${managingDAOAddress}`);
  console.log(`Using PluginSetupProcessor ${pluginSetupProcessorAddress}`);
  console.log(`Using DAORegistry ${daoRegistryAddress}`);
  console.log(`Using PreviousDAOFactory ${previousDAOFactoryAddress}`);

  const deployResult = await deploy('DAOFactory', {
    contract: daoFactoryArtifact,
    from: deployer.address,
    args: [daoRegistryAddress, pluginSetupProcessorAddress],
    log: true,
  });

  const daoInterface = DAO__factory.createInterface();
  const calldata = daoInterface.encodeFunctionData(
    'applyMultiTargetPermissions',
    [
      [
        {
          who: previousDAOFactoryAddress,
          where: daoRegistryAddress,
          operation: Operation.Revoke,
          permissionId: ethers.utils.id('REGISTER_DAO_PERMISSION'),
          condition: ethers.constants.AddressZero,
        },
        {
          who: deployResult.address,
          where: daoRegistryAddress,
          operation: Operation.Grant,
          permissionId: ethers.utils.id('REGISTER_DAO_PERMISSION'),
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
    description: `Moves the <strong>REGISTER_DAO_PERMISSION_ID</strong> permission on the <strong>DAORegistry</strong> (<code>${daoRegistryAddress}</code>) from the old <strong>DAOFactory</strong> (<code>${previousDAOFactoryAddress}</code>) to the new <strong>DAOFactory</strong> (<code>${deployResult.address}</code>).`,
  });
};
export default func;
func.tags = ['DAOFactory', 'v1.3.0'];
