import {ENSRegistry__factory} from '../../../typechain';
import {ENSRegistry} from '../../../typechain/ENSRegistry';
import {daoDomainEnv, pluginDomainEnv} from '../../../utils/environment';
import {
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
  managementDAOAddress: string,
  domain: string,
  node: string,
  deployer: SignerWithAddress,
  hre: HardhatRuntimeEnvironment,
  ethers: any
) {
  let owner = await ensRegistryContract.owner(node);

  // node hasn't been registered yet
  if (owner === ethers.constants.AddressZero) {
    owner = await registerSubnodeRecord(
      domain,
      deployer,
      await getENSAddress(hre),
      await getPublicResolverAddress(hre)
    );
  }

  if (owner !== managementDAOAddress && owner !== deployer.address) {
    throw new Error(
      `${domain} is not owned either by deployer: ${deployer.address} or management dao: ${managementDAOAddress}. 
      Check if the domain is owned by ENS wrapper and if so, unwrap it from the ENS app.`
    );
  }

  // It could be the case that domain is already owned by the management DAO which could happen
  // if the script succeeded and is re-run again. So avoid transfer which would fail otherwise.
  if (owner === deployer.address) {
    await transferSubnodeChain(
      domain,
      managementDAOAddress,
      deployer.address,
      await getENSAddress(hre)
    );
  }
}

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

  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Check if domains are owned by the managementDAO
  const daoNode = ethers.utils.namehash(daoDomain);
  const pluginNode = ethers.utils.namehash(pluginDomain);

  await registerAndTransferDomain(
    ensRegistryContract,
    managementDAOAddress,
    daoDomain,
    daoNode,
    deployer,
    hre,
    ethers
  );

  await registerAndTransferDomain(
    ensRegistryContract,
    managementDAOAddress,
    pluginDomain,
    pluginNode,
    deployer,
    hre,
    ethers
  );
};
export default func;
func.tags = ['New', 'ENSSubdomains', 'Batch-3'];
