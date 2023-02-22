import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  let grantTx;

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  const REGISTER_DAO_PERMISSION_ID = ethers.utils.id('REGISTER_DAO_PERMISSION');

  // Get `DAOFactory` address.
  const daoFactoryAddress = await getContractAddress('DAOFactory', hre);

  // Gransting Permissions
  grantTx = await managingDaoContract.grant(
    daoRegistryAddress,
    daoFactoryAddress,
    REGISTER_DAO_PERMISSION_ID
  );
  await grantTx.wait();

  console.log(
    `Granted the REGISTER_DAO_PERMISSION of daoRegistry (${daoRegistryAddress}) to DAOFactory (${daoFactoryAddress}) (tx: ${grantTx.hash})`
  );
};
export default func;
func.tags = ['DAO_Registry_Permissions'];
