import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {ensDomainHash, ensLabelHash, setupENS} from '../../utils/ensHelpers';
import {
  DAO,
  ENSSubdomainRegistrar,
  ENSRegistry,
  PublicResolver,
} from '../../typechain';

export async function deployENSSubdomainRegistrar(
  owner: SignerWithAddress,
  managingDao: DAO,
  domain: string
): Promise<ENSSubdomainRegistrar> {
  const deployer = await owner.getAddress();
  const ens = await setupENS(deployer, domain);

  const ENSSubdomainRegistrar = await ethers.getContractFactory(
    'ENSSubdomainRegistrar'
  );

  // Deploy the ENS and approve the subdomain registrar
  const ensSubdomainRegistrar = await ENSSubdomainRegistrar.deploy();
  await ens
    .connect(owner)
    .setApprovalForAll(ensSubdomainRegistrar.address, true);

  // Initialize it with the domain
  const node = ethers.utils.namehash(domain);
  ensSubdomainRegistrar.initialize(managingDao.address, ens.address, node);

  return ensSubdomainRegistrar;
}

export async function setupResolver(
  ens: ENSRegistry,
  resolver: PublicResolver,
  owner: SignerWithAddress
) {
  await ens
    .connect(owner)
    .setSubnodeOwner(
      ensDomainHash(''),
      ensLabelHash('resolver'),
      await owner.getAddress()
    );

  const resolverNode = ensDomainHash('resolver');

  await ens.connect(owner).setResolver(resolverNode, resolver.address);
  await resolver
    .connect(owner)
    ['setAddr(bytes32,address)'](resolverNode, resolver.address);
}
