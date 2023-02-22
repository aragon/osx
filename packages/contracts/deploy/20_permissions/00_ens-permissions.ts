import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nSetting framework permission.`);

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

  // Get `PluginRepoRegistry` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistry',
    hre
  );

  // Get DAO's `ENSSubdomainRegistrar` address.
  const daoEnsSubdomainRegistrarAddress = await getContractAddress(
    'DAO_ENSSubdomainRegistrar',
    hre
  );

  // Get Plugin's `ENSSubdomainRegistrar` address.
  const pluginEnsSubdomainRegistrarAddress = await getContractAddress(
    'Plugin_ENSSubdomainRegistrar',
    hre
  );

  const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
    'REGISTER_ENS_SUBDOMAIN_PERMISSION'
  );

  // Granting Permissions
  grantTx = await managingDaoContract.grant(
    daoEnsSubdomainRegistrarAddress,
    daoRegistryAddress,
    REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
  );
  await grantTx.wait();

  console.log(
    `Granted the REGISTER_ENS_SUBDOMAIN_PERMISSION of 'ensSubdomainRegistrar' (${daoEnsSubdomainRegistrarAddress}) to 'daoRegistry' (${daoRegistryAddress}) (tx: ${grantTx.hash})`
  );

  grantTx = await managingDaoContract.grant(
    pluginEnsSubdomainRegistrarAddress,
    pluginRepoRegistryAddress,
    REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
  );
  await grantTx.wait();

  console.log(
    `Granted the REGISTER_ENS_SUBDOMAIN_PERMISSION of 'ensSubdomainRegistrar' (${pluginEnsSubdomainRegistrarAddress}) to 'pluginRepoRegistry' (${pluginRepoRegistryAddress}) (tx: ${grantTx.hash})`
  );
};
export default func;
func.tags = ['ENS_Permissions'];
