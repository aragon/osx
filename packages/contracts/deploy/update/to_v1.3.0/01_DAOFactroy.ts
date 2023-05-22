import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DAOFactory__factory} from '../../../typechain';
import {Operation} from '../../../utils/types';
import {getContractAddress} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('Updating DAOFactory');
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const managingDAOAddress = await getContractAddress('managingDAO', hre);
  const pluginSetupProcessorAddress = await getContractAddress(
    'PluginSetupProcessor',
    hre
  );
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);
  const previousDAOFactoryAddress = await getContractAddress('DAOFactory', hre);
  console.log(`Using managingDAO ${managingDAOAddress}`);
  console.log(`Using PluginSetupProcessor ${pluginSetupProcessorAddress}`);
  console.log(`Using DAORegistry ${daoRegistryAddress}`);
  console.log(`Using PreviousDAOFactory ${previousDAOFactoryAddress}`);

  const DAOFactory = new DAOFactory__factory(deployer);
  const deployResult = await DAOFactory.deploy(
    daoRegistryAddress,
    pluginSetupProcessorAddress
  );

  const daoInterface = DAOFactory.interface;
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
    description: `Moves perimssion (REGISTER_DAO_PERMISSION) from old DAOFactory ${previousDAOFactoryAddress} to new DAOFactory ${deployResult.address} on DAORegistry ${daoRegistryAddress}`,
  });
};
export default func;
func.tags = ['DAOFactory'];
