import {DAO__factory} from '../../../typechain';
import {getContractAddress, managePermissions} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAO` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Get `DAOFactory` address.
  const daoFactoryAddress = await getContractAddress('DAOFactory', hre);

  // Grant `REGISTER_DAO_PERMISSION` of `DAORegistryProxy` to `DAOFactory`.
  // Grant `UPGRADE_REGISTRY_PERMISSION` of `DAORegistryProxy` to `ManagementDAOProxy`.
  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
      who: {name: 'DAOFactory', address: daoFactoryAddress},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
      who: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      permission: 'UPGRADE_REGISTRY_PERMISSION',
    },
  ];
  await managePermissions(managementDaoContract, grantPermissions);
};
export default func;
func.tags = ['New', 'DAO_Registry_Permissions'];
