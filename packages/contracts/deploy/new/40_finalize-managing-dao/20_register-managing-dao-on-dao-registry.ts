import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {
  getContractAddress,
  getENSAddress,
  isENSDomainRegistered,
  MANAGING_DAO_METADATA,
  uploadToIPFS,
} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {getNamedAccounts, ethers, network} = hre;
  const {deployer} = await getNamedAccounts();

  // Get info from .env
  const daoSubdomain = process.env.MANAGINGDAO_SUBDOMAIN || '';
  const daoDomain =
    process.env[`${network.name.toUpperCase()}_DAO_ENS_DOMAIN`] || '';

  if (!daoSubdomain)
    throw new Error('ManagingDAO subdomain has not been set in .env');

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  // Get `DAORegistry` contract.
  const daoRegistryContract = await ethers.getContractAt(
    'DAORegistry',
    daoRegistryAddress
  );

  if (
    await isENSDomainRegistered(
      `${daoSubdomain}.${daoDomain}`,
      await getENSAddress(hre)
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
    deployer,
    daoSubdomain
  );
  await registerTx.wait();
  console.log(
    `Registered the (managingDAO: ${managingDAOAddress}) on (DAORegistry: ${daoRegistryAddress}), see (tx: ${registerTx.hash})`
  );

  // Set Metadata for the Managing DAO
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
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
func.tags = ['RegisterManagingDAO'];
