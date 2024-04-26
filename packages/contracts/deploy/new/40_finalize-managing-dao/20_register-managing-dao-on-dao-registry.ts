import {DAO__factory, DAORegistry__factory} from '../../../typechain';
import {
  getContractAddress,
  getENSAddress,
  isENSDomainRegistered,
  MANAGING_DAO_METADATA,
  uploadToIPFS,
} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  // Get info from .env
  const daoSubdomain = process.env.MANAGEMENT_DAO_SUBDOMAIN || '';
  const daoDomain =
    process.env[`${network.name.toUpperCase()}_DAO_ENS_DOMAIN`] || '';

  if (!daoSubdomain)
    throw new Error('ManagingDAO subdomain has not been set in .env');

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  // Get `DAORegistry` contract.
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
    // not beeing able to register the managing DAO means that something is not right with the framework deployment used.
    // Either a fruntrun happened or something else. Thus we abort here
    throw new Error(
      `A DAO with ${daoSubdomain}.${daoDomain} is already registered! Aborting...`
    );
  }
  // Register `managingDAO` on `DAORegistry`.
  const registerTx = await daoRegistryContract.register(
    managingDAOAddress,
    deployer.address,
    daoSubdomain
  );
  await registerTx.wait();
  console.log(
    `Registered the (managingDAO: ${managingDAOAddress}) on (DAORegistry: ${daoRegistryAddress}), see (tx: ${registerTx.hash})`
  );

  // Set Metadata for the Managing DAO
  const managingDaoContract = DAO__factory.connect(
    managingDAOAddress,
    deployer
  );
  const metadataCIDPath = await uploadToIPFS(
    JSON.stringify(MANAGING_DAO_METADATA),
    network.name
  );

  const setMetadataTX = await managingDaoContract.setMetadata(
    ethers.utils.hexlify(ethers.utils.toUtf8Bytes(`ipfs://${metadataCIDPath}`))
  );
  await setMetadataTX.wait();
};
export default func;
func.tags = ['New', 'RegisterManagingDAO'];
