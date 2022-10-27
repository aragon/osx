import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nSetting framework permission.`);

  const {ethers} = hre;
  let grantTx;

  // Get managing DAO address.
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
  const ensSubdomainRegistrarAddress = await getContractAddress(
    'DAO_ENSSubdomainRegistrar',
    hre
  );

  const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
    'REGISTER_ENS_SUBDOMAIN_PERMISSION'
  );

  // Gransting Permissions
  grantTx = await managingDaoContract.grant(
    ensSubdomainRegistrarAddress,
    daoRegistryAddress,
    REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
  );
  await grantTx.wait();

  console.log(
    `Granted the REGISTER_ENS_SUBDOMAIN_PERMISSION of 'ensSubdomainRegistrar' (${ensSubdomainRegistrarAddress}) to 'daoRegistry' (${daoRegistryAddress}) (tx: ${grantTx.hash})`
  );

  grantTx = await managingDaoContract.grant(
    ensSubdomainRegistrarAddress,
    pluginRepoRegistryAddress,
    REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
  );
  await grantTx.wait();

  console.log(
    `Granted the REGISTER_ENS_SUBDOMAIN_PERMISSION of 'ensSubdomainRegistrar' (${ensSubdomainRegistrarAddress}) to 'pluginRepoRegistry' (${pluginRepoRegistryAddress}) (tx: ${grantTx.hash})`
  );
};
export default func;
func.tags = ['ENS_Permissions'];
