import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  getContractAddress,
  getENSAddress,
  getPublicResolverAddress,
  registerSubnodeRecord,
  transferSubnodeChain,
} from '../../helpers';
import {ENSRegistry__factory} from '../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  // Get ENS subdomains
  const daoDomain =
    process.env[`${network.name.toUpperCase()}_DAO_ENS_DOMAIN`] || '';
  const pluginDomain =
    process.env[`${network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`] || '';

  if (!daoDomain || !pluginDomain) {
    throw new Error('DAO or Plugin ENS domains have not been set in .env');
  }

  const ensRegistryAddress = await getENSAddress(hre);
  const ensRegistryContract = ENSRegistry__factory.connect(
    ensRegistryAddress,
    deployer
  );

  // Check if domains are owned by the managingDAO
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

  // Registration is now complete. Lets move the ownership of all domains to the managing DAO
  const managingDAOAddress = await getContractAddress('DAO', hre);
  await transferSubnodeChain(
    daoDomain,
    managingDAOAddress,
    deployer.address,
    await getENSAddress(hre)
  );
  await transferSubnodeChain(
    pluginDomain,
    managingDAOAddress,
    deployer.address,
    await getENSAddress(hre)
  );
};
export default func;
func.tags = ['New', 'ENSSubdomains'];
// TODO:GIORGI when running the script 2nd time, this needs to be commented
// or code needs to move from geo browser to this.
// func.skip = (hre: HardhatRuntimeEnvironment) => Promise.resolve(true);
