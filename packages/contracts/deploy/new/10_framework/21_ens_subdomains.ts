import {ENSRegistry__factory} from '../../../typechain';
import {daoDomainEnv, pluginDomainEnv} from '../../../utils/environment';
import {
  getContractAddress,
  getENSAddress,
  getPublicResolverAddress,
  registerSubnodeRecord,
  transferSubnodeChain,
} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  // Get ENS subdomains
  const daoDomain = daoDomainEnv(network);
  const pluginDomain = pluginDomainEnv(network);

  const ensRegistryAddress = await getENSAddress(hre);
  const ensRegistryContract = ENSRegistry__factory.connect(
    ensRegistryAddress,
    deployer
  );

  // Check if domains are owned by the managementDAO
  const daoNode = ethers.utils.namehash(daoDomain);
  const pluginNode = ethers.utils.namehash(pluginDomain);

  let daoDomainOwnerAddress = await ensRegistryContract.owner(daoNode);

  // node hasn't been registered yet
  if (daoDomainOwnerAddress === ethers.constants.AddressZero) {
    daoDomainOwnerAddress = await registerSubnodeRecord(
      daoDomain,
      deployer,
      await getENSAddress(hre),
      await getPublicResolverAddress(hre)
    );
  }
  if (daoDomainOwnerAddress != deployer.address) {
    throw new Error(
      `${daoDomain} is not owned by deployer: ${deployer.address}.`
    );
  }

  let pluginDomainOwnerAddress = await ensRegistryContract.owner(pluginNode);
  // node hasn't been registered yet
  if (pluginDomainOwnerAddress === ethers.constants.AddressZero) {
    pluginDomainOwnerAddress = await registerSubnodeRecord(
      pluginDomain,
      deployer,
      await getENSAddress(hre),
      await getPublicResolverAddress(hre)
    );
  }
  if (pluginDomainOwnerAddress != deployer.address) {
    throw new Error(
      `${pluginDomain} is not owned by deployer: ${deployer.address}.`
    );
  }

  // Registration is now complete. Lets move the ownership of all domains to the management DAO
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );
  await transferSubnodeChain(
    daoDomain,
    managementDAOAddress,
    deployer.address,
    await getENSAddress(hre)
  );
  await transferSubnodeChain(
    pluginDomain,
    managementDAOAddress,
    deployer.address,
    await getENSAddress(hre)
  );
};
export default func;
func.tags = ['New', 'ENSSubdomains'];
