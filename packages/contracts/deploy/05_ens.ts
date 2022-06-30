import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

function ensLabelHash(label: string, ethers: any): string {
  return ethers.utils.id(label);
}

function ensDomainHash(name: string, ethers: any): string {
  return ethers.utils.namehash(name);
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const ensRet = await deploy('ENSRegistry', {
    from: deployer,
    log: true,
  });
  const ensRegistryAddress: string = ensRet.receipt?.contractAddress || '';

  const ensResolverRet = await deploy('PublicResolver', {
    from: deployer,
    args: [ensRegistryAddress, ethers.constants.AddressZero],
    log: true,
  });
  const ensResolverAddress: string =
    ensResolverRet.receipt?.contractAddress || '';

  // setup resolver
  const ensRegistryContract = await ethers.getContractAt(
    'ENSRegistry',
    ensRegistryAddress
  );
  const ensResolverContract = await ethers.getContractAt(
    'PublicResolver',
    ensResolverAddress
  );
  await ensRegistryContract.setSubnodeOwner(
    ensDomainHash('', ethers),
    ensLabelHash('resolver', ethers),
    deployer
  );

  const resolverNode = ensDomainHash('resolver', ethers);

  await ensRegistryContract.setResolver(resolverNode, ensResolverAddress);
  await ensResolverContract['setAddr(bytes32,address)'](
    resolverNode,
    ensResolverAddress
  );

  await ensRegistryContract.setSubnodeOwner(
    ensDomainHash('', ethers),
    ensLabelHash('eth', ethers),
    deployer
  );

  await ensRegistryContract.setSubnodeOwner(
    ensDomainHash('eth', ethers),
    ensLabelHash('dao', ethers),
    deployer
  );

  const managingDAOAddress = await getContractAddress('DAO', hre);
  const node = ethers.utils.namehash('dao.eth');

  // deterministic
  const [owner] = await ethers.getSigners();
  const nonce = await owner.getTransactionCount();
  const futureAddress = ethers.utils.getContractAddress({
    from: deployer,
    nonce: nonce + 2, // next address is implementation, so we use +2 for the proxy address
  });

  await ensRegistryContract.setApprovalForAll(futureAddress, true);

  await deploy('ENSSubdomainRegistrar', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      owner: deployer,
      proxyContract: 'UUPSProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [managingDAOAddress, ensRegistryAddress, node],
        },
      },
    },
  });
};
export default func;
func.tags = ['ManagingDao'];
