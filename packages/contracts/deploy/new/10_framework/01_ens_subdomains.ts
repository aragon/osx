import {ENSRegistry, ENSRegistry__factory} from '../../../typechain';
import {
  ENS_ADDRESSES,
  getContractAddress,
  getENSAddress,
  getPublicResolverAddress,
  registerSubnodeRecord,
  transferSubnodeChain,
} from '../../helpers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

async function registerAndTransferDomain(
  ensRegistryContract: ENSRegistry,
  managingDAOAddress: string,
  domain: string,
  node: string,
  deployer: SignerWithAddress,
  hre: HardhatRuntimeEnvironment,
  ethers: any
) {
  let owner = await ensRegistryContract.owner(node);

  if (owner !== managingDAOAddress && owner !== deployer.address) {
    throw new Error(
      `${domain} is not owned either by deployer: ${deployer.address} or management dao: ${managingDAOAddress}. 
      Check if the domain is owned by ENS wrapper and if so, unwrap it from the ENS app.`
    );
  }

  // It could be the case that domain is already owned by the management DAO which could happen
  // if the script succeeded and is re-run again. So avoid transfer which would fail otherwise.
  if (owner === deployer.address) {
    await transferSubnodeChain(
      domain,
      managingDAOAddress,
      deployer.address,
      await getENSAddress(hre)
    );
  }
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  // Get ENS subdomains
  const daoDomain =
    process.env[`${network.name.toUpperCase()}_DAO_ENS_DOMAIN`] || '';
  const pluginDomain =
    process.env[`${network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`] || '';

  const ensRegistryAddress = await getENSAddress(hre);
  const ensRegistryContract = ENSRegistry__factory.connect(
    ensRegistryAddress,
    deployer
  );

  const managingDAOAddress = await getContractAddress('DAO', hre);

  const daoNode = ethers.utils.namehash(daoDomain);
  const pluginNode = ethers.utils.namehash(pluginDomain);

  await registerAndTransferDomain(
    ensRegistryContract,
    managingDAOAddress,
    daoDomain,
    daoNode,
    deployer,
    hre,
    ethers
  );

  await registerAndTransferDomain(
    ensRegistryContract,
    managingDAOAddress,
    pluginDomain,
    pluginNode,
    deployer,
    hre,
    ethers
  );
};
export default func;
func.tags = ['New', 'ENSSubdomains'];
