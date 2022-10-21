import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  let grantTx;

  const managingDAOAddress = await getContractAddress('DAO', hre);
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  console.log('Granting permissions');
  const REGISTER_PLUGIN_REPO_PERMISSION_ID = ethers.utils.id(
    'REGISTER_PLUGIN_REPO_PERMISSION'
  );
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistry',
    hre
  );
  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );

  console.log(
    `Granting the REGISTER_PLUGIN_REPO_PERMISSION_ID permission to the pluginRepoFactory (${pluginRepoFactoryAddress})`
  );
  grantTx = await managingDaoContract.grant(
    pluginRepoRegistryAddress,
    pluginRepoFactoryAddress,
    REGISTER_PLUGIN_REPO_PERMISSION_ID
  );
  await grantTx.wait();

  // Grant REGISTER_ENS_SUBDOMAIN_PERMISSION to daoRegistry
  const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
    'REGISTER_ENS_SUBDOMAIN_PERMISSION'
  );
  const ensSubdomainRegistrarAddress = await getContractAddress(
    'ENSSubdomainRegistrar',
    hre
  );

  console.log(
    `Granting the REGISTER_ENS_SUBDOMAIN_PERMISSION_ID permission to the daoRegistry (${daoRegistryAddress})`
  );
  grantTx = await managingDaoContract.grant(
    ensSubdomainRegistrarAddress,
    daoRegistryAddress,
    REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
  );
  await grantTx.wait();

  console.log(
    `Granting the REGISTER_ENS_SUBDOMAIN_PERMISSION_ID permission to the pluginRepoRegistry (${pluginRepoRegistryAddress})`
  );
  grantTx = await managingDaoContract.grant(
    ensSubdomainRegistrarAddress,
    pluginRepoRegistryAddress,
    REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
  );
  await grantTx.wait();

  // Grant REGISTER_DAO_PERMISSION_ID to daoRegistry
  const REGISTER_DAO_PERMISSION_ID = ethers.utils.id('REGISTER_DAO_PERMISSION');
  const daoFactoryAddress = await getContractAddress('DAOFactory', hre);

  console.log(
    `Granting the REGISTER_DAO_PERMISSION_ID permission of daoRegistry (${daoRegistryAddress}) to DAOFactory (${daoFactoryAddress})`
  );
  grantTx = await managingDaoContract.grant(
    daoRegistryAddress,
    daoFactoryAddress,
    REGISTER_DAO_PERMISSION_ID
  );
  await grantTx.wait();
};
export default func;
func.tags = ['Permissions'];
