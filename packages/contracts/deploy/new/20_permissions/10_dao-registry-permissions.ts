import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {Operation} from '../../../utils/types';
import {getContractAddress, managePermissions} from '../../helpers';
import {DAO__factory} from '../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = DAO__factory.connect(
    managingDAOAddress,
    deployer
  );

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  // Get `DAOFactory` address.
  const daoFactoryAddress = await getContractAddress('DAOFactory', hre);

  // Grant `REGISTER_DAO_PERMISSION` of `DAORegistry` to `DAOFactory`.
  // Grant `UPGRADE_REGISTRY_PERMISSION` of `DAORegistry` to `ManagingDAO`.
  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistry', address: daoRegistryAddress},
      who: {name: 'DAOFactory', address: daoFactoryAddress},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistry', address: daoRegistryAddress},
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'UPGRADE_REGISTRY_PERMISSION',
    },
  ];
  await managePermissions(managingDaoContract, grantPermissions);
};
export default func;
func.tags = ['New', 'DAO_Registry_Permissions'];
