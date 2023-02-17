import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nFinalizing ManagingDao.`);

  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  // Get info from .env
  const daoSubdomain = process.env.MANAGINGDAO_SUBDOMAIN || '';

  if (!daoSubdomain)
    throw new Error('ManagingDAO subdomain has not been set in .env');

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  // Get `DAORegistry` contract.
  const daoRegistryContract = await ethers.getContractAt(
    'DAORegistry',
    daoRegistryAddress
  );

  // Grant `REGISTER_DAO_PERMISSION` to deployer.
  const REGISTER_DAO_PERMISSION_ID = ethers.utils.id('REGISTER_DAO_PERMISSION');

  const grantTx = await managingDaoContract.grant(
    daoRegistryAddress,
    deployer,
    REGISTER_DAO_PERMISSION_ID
  );
  await grantTx.wait();
  console.log(
    `Granted the REGISTER_DAO_PERMISSION of (DAORegistry: ${daoRegistryAddress}) to (Deployer: ${deployer}), see (tx: ${grantTx.hash})`
  );

  // Register `managingDAO` on `DAORegistry`.
  const registerTx = await daoRegistryContract.register(
    managingDAOAddress,
    deployer,
    daoSubdomain
  );
  await registerTx.wait();
  console.log(
    `Registered the (managingDAO: ${managingDAOAddress}) on (DAORegistry: ${daoRegistryAddress}), see (tx: ${registerTx.hash})`
  );

  // Revoke `REGISTER_DAO_PERMISSION` from deployer.
  const revokeTx = await managingDaoContract.revoke(
    daoRegistryAddress,
    deployer,
    REGISTER_DAO_PERMISSION_ID
  );
  await revokeTx.wait();
  console.log(
    `Revoked the REGISTER_DAO_PERMISSION of (DAORegistry: ${daoRegistryAddress}) from (Deployer: ${deployer}), see (tx: ${revokeTx.hash})`
  );
};
export default func;
func.tags = ['RegisterManagingDAO'];
