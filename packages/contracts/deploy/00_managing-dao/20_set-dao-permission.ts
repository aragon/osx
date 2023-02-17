import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress, managePermission} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  // Set all the permission needed for a DAO to operate normally as if it was created via DAOFactory.
  const permissions = [
    'ROOT_PERMISSION',
    'UPGRADE_DAO_PERMISSION',
    'SET_SIGNATURE_VALIDATOR_PERMISSION',
    'SET_TRUSTED_FORWARDER_PERMISSION',
    'SET_METADATA_PERMISSION',
    'REGISTER_STANDARD_CALLBACK_PERMISSION',
  ];

  for (let index = 0; index < permissions.length; index++) {
    const permission = permissions[index];

    await managePermission({
      isGrant: true,
      permissionManagerContract: managingDaoContract,
      where: {name: 'managingDAO', address: managingDAOAddress},
      who: {name: 'managingDAO', address: managingDAOAddress},
      permission: permission,
    });
  }
};
export default func;
func.tags = ['SetDAOPermissions'];
