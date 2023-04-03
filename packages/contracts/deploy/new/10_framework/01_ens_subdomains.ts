import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  getContractAddress,
  getENSAddress,
  getPublicResolverAddress,
  registerSubnodeRecord,
  transferSubnodeChain,
} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  // Get ENS subdomains
  const daoDomain =
    process.env[`${network.name.toUpperCase()}_DAO_ENS_DOMAIN`] || '';
  const pluginDomain =
    process.env[`${network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`] || '';

  if (!daoDomain || !pluginDomain) {
    throw new Error('DAO or Plugin ENS domains have not been set in .env');
  }

  const ensRegistryAddress = await getENSAddress(hre);
  const ensRegistryContract = await ethers.getContractAt(
    'ENSRegistry',
    ensRegistryAddress
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
  if (daoDomainOwnerAddress != deployer) {
    throw new Error(`${daoDomain} is not owned by deployer: ${deployer}.`);
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
  if (pluginDomainOwnerAddress != deployer) {
    throw new Error(`${pluginDomain} is not owned by deployer: ${deployer}.`);
  }

  // Registration is now complete. Lets move the ownership of all domains to the managing DAO
  const managingDAOAddress = await getContractAddress('DAO', hre);
  await transferSubnodeChain(
    daoDomain,
    managingDAOAddress,
    deployer,
    await getENSAddress(hre)
  );
  await transferSubnodeChain(
    pluginDomain,
    managingDAOAddress,
    deployer,
    await getENSAddress(hre)
  );
};
export default func;
func.tags = ['ENSSubdomains'];
