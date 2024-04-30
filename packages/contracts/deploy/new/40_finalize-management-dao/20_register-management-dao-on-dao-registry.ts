import {DAO__factory, DAORegistry__factory} from '../../../typechain';
import {
  daoDomainEnv,
  managementDaoSubdomainEnv,
} from '../../../utils/environment';
import {
  getContractAddress,
  getENSAddress,
  isENSDomainRegistered,
  MANAGEMENT_DAO_METADATA,
  uploadToIPFS,
} from '../../helpers';
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

  if (
    await isENSDomainRegistered(
      `${daoSubdomain}.${daoDomain}`,
      await getENSAddress(hre),
      deployer
    )
  ) {
    // not beeing able to register the management DAO means that something is not right with the framework deployment used.
    // Either a fruntrun happened or something else. Thus we abort here
    throw new Error(
      `A DAO with ${daoSubdomain}.${daoDomain} is already registered! Aborting...`
    );
  }
  // Register `managementDAO` on `DAORegistry`.
  const registerTx = await daoRegistryContract.register(
    managementDAOAddress,
    deployer.address
  );
  await registerTx.wait();
  console.log(
    `Registered the (ManagementDAOProxy: ${managementDAOAddress}) on (DAORegistry: ${daoRegistryAddress}), see (tx: ${registerTx.hash})`
  );

  // Set Metadata for the Management DAO
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );
  const metadataCIDPath = await uploadToIPFS(
    JSON.stringify(MANAGEMENT_DAO_METADATA),
    network.name
  );

  const setMetadataTX = await managementDaoContract.setMetadata(
    ethers.utils.hexlify(ethers.utils.toUtf8Bytes(`ipfs://${metadataCIDPath}`))
  );
  await setMetadataTX.wait();
};
export default func;
func.tags = ['New', 'RegisterManagementDAO'];
