import {DAO__factory, DAORegistry__factory} from '../../../typechain';
import {ENSRegistry__factory} from '../../../typechain/factories/ENSRegistry__factory';
import {
  daoDomainEnv,
  isLocal,
  managementDaoSubdomainEnv,
} from '../../../utils/environment';
import {getContractAddress, getENSAddress, uploadToIPFS} from '../../helpers';
import MANAGEMENT_DAO_METADATA from '../../management-dao-metadata.json';
import {uploadToPinata} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  // Get info from .env
  const daoSubdomain = managementDaoSubdomainEnv(network);
  const daoDomain = daoDomainEnv(network);

  if (!daoSubdomain)
    throw new Error('ManagementDAO subdomain has not been set in .env');

  const node = ethers.utils.namehash(`${daoSubdomain}.${daoDomain}`);

  // Get `ManagementDAOProxy` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Get `DAORegistryProxy` contract.
  const daoRegistryContract = DAORegistry__factory.connect(
    daoRegistryAddress,
    deployer
  );

  const ensRegistryContract = ENSRegistry__factory.connect(
    await getENSAddress(hre),
    deployer
  );
  let owner = await ensRegistryContract.owner(node);

  let daoENSSubdomainRegistrar = await getContractAddress(
    'DAOENSSubdomainRegistrarProxy',
    hre
  );

  if (
    owner != daoENSSubdomainRegistrar &&
    owner != ethers.constants.AddressZero
  ) {
    throw new Error(
      `A DAO with ${daoSubdomain}.${daoDomain} is registered and owned by 
      someone other than ENSSubdomainRegistrar ${daoENSSubdomainRegistrar}.`
    );
  }

  if (owner === ethers.constants.AddressZero) {
    // Register `managingDAO` on `DAORegistry`.
    const registerTx = await daoRegistryContract.register(
      managementDAOAddress,
      deployer.address,
      daoSubdomain
    );
    await registerTx.wait();
    console.log(
      `Registered the (managingDAO: ${managementDAOAddress}) on (DAORegistry: ${daoRegistryAddress}), see (tx: ${registerTx.hash})`
    );
  }

  // Set Metadata for the Management DAO
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  let metadataCIDPath = '0x';

  if (!isLocal(hre.network)) {
    // Upload the metadata to IPFS
    metadataCIDPath = await uploadToPinata(
      JSON.stringify(MANAGEMENT_DAO_METADATA, null, 2),
      `management-dao-metadata`
    );
  }

  const hasMetadataPermission = await managementDaoContract.hasPermission(
    managementDaoContract.address,
    deployer.address,
    ethers.utils.id('SET_METADATA_PERMISSION'),
    '0x'
  );

  if (hasMetadataPermission) {
    const setMetadataTX = await managementDaoContract.setMetadata(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadataCIDPath))
    );
    await setMetadataTX.wait();
  }
};
export default func;
func.tags = ['New', 'RegisterManagementDAO'];
