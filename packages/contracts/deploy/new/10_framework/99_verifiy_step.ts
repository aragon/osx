import {
  DAOFactory__factory,
  DAORegistry__factory,
  ENSRegistry__factory,
  ENSSubdomainRegistrar__factory,
  PluginRepoFactory__factory,
  PluginRepoRegistry__factory,
  PluginSetupProcessor__factory,
} from '../../../typechain';
import {daoDomainEnv, pluginDomainEnv} from '../../../utils/environment';
import {checkSetManagementDao, getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying framework deployment.');

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // VERIFYING DAO REGISTRY
  const DAORegistryAddress = await getContractAddress('DAORegistryProxy', hre);
  const DAORegistry = DAORegistry__factory.connect(
    DAORegistryAddress,
    deployer
  );

  await checkSetManagementDao(DAORegistry, managementDAOAddress);
  // ! not nedded as the registry no longer has the subdomain registrar
  // // scope to reuse same const again
  // {
  //   const SubdomainRegistrarAddress = await DAORegistry.subdomainRegistrar();
  //   if (SubdomainRegistrarAddress !== DAOENSSubdomainRegistrarAddress) {
  //     throw new Error(
  //       `${DAORegistry} has wrong SubdomainRegistrarAddress set. Expected ${DAOENSSubdomainRegistrarAddress} to be ${SubdomainRegistrarAddress}`
  //     );
  //   }
  // }

  // VERIFYING DAO ENS SUBDOMAIN REGISTRAR
  const DAOENSSubdomainRegistrarAddress = await getContractAddress(
    'DAOENSSubdomainRegistrarProxy',
    hre
  );
  const DAOENSSubdomainRegistrar = ENSSubdomainRegistrar__factory.connect(
    DAOENSSubdomainRegistrarAddress,
    deployer
  );

  await checkSetManagementDao(DAOENSSubdomainRegistrar, managementDAOAddress);
  // scope to reuse same const again
  {
    const ensAddr = await DAOENSSubdomainRegistrar.ens();
    const ensRegistryContract = ENSRegistry__factory.connect(ensAddr, deployer);
    const isApprovedForAll = await ensRegistryContract.isApprovedForAll(
      managementDAOAddress,
      DAOENSSubdomainRegistrarAddress
    );
    if (!isApprovedForAll) {
      throw new Error(
        `DAOENSSubdomainRegistrar isn't approved for all. Expected ${managementDAOAddress} to have ${DAOENSSubdomainRegistrarAddress} approved for all`
      );
    }

    const node = await DAOENSSubdomainRegistrar.node();
    const expectedNode = ethers.utils.namehash(daoDomainEnv(hre.network));
    if (node !== expectedNode) {
      throw new Error(
        `DAOENSSubdomainRegistrar node (${node}) doesn't match expected node (${expectedNode})`
      );
    }
  }

  // check is the correct registry
  {
    const SubdomainRegistry = await DAOENSSubdomainRegistrar.registry();
    console.log('SubdomainRegistry', SubdomainRegistry);
    console.log('DAORegistryAddress', DAORegistryAddress);

    if (SubdomainRegistry !== DAORegistryAddress) {
      throw new Error(
        `${DAOENSSubdomainRegistrar} has wrong Registry set. Expected ${DAORegistryAddress} to be ${SubdomainRegistry}`
      );
    }
  }

  // VERIFYING PLUGIN REPO REGISTRY
  const PluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistryProxy',
    hre
  );
  const PluginRepoRegistry = PluginRepoRegistry__factory.connect(
    PluginRepoRegistryAddress,
    deployer
  );
  await checkSetManagementDao(PluginRepoRegistry, managementDAOAddress);

  // ! not needed as the registry no longer has the subdomain registrar
  // scope to reuse same const again
  // {
  //   const SubdomainRegistrarAddress =
  //     await PluginRepoRegistry.subdomainRegistrar();
  //   if (SubdomainRegistrarAddress !== PluginENSSubdomainRegistrarAddress) {
  //     throw new Error(
  //       `${PluginRepoRegistry} has wrong SubdomainRegistrarAddress set. Expected ${PluginENSSubdomainRegistrarAddress} to be ${SubdomainRegistrarAddress}`
  //     );
  //   }
  // }

  // VERIFYING PLUGIN ENS SUBDOMAIN REGISTRAR
  const PluginENSSubdomainRegistrarAddress = await getContractAddress(
    'PluginENSSubdomainRegistrarProxy',
    hre
  );
  const PluginENSSubdomainRegistrar = ENSSubdomainRegistrar__factory.connect(
    PluginENSSubdomainRegistrarAddress,
    deployer
  );
  await checkSetManagementDao(
    PluginENSSubdomainRegistrar,
    managementDAOAddress
  );
  // scope to reuse same const again
  {
    const ensAddr = await PluginENSSubdomainRegistrar.ens();
    const ensRegistryContract = ENSRegistry__factory.connect(ensAddr, deployer);
    const isApprovedForAll = await ensRegistryContract.isApprovedForAll(
      managementDAOAddress,
      PluginENSSubdomainRegistrarAddress
    );
    if (!isApprovedForAll) {
      throw new Error(
        `PluginENSSubdomainRegistrar isn't approved for all. Expected ${managementDAOAddress} to have ${PluginENSSubdomainRegistrarAddress} approved for all`
      );
    }

    const node = await PluginENSSubdomainRegistrar.node();
    const expectedNode = ethers.utils.namehash(pluginDomainEnv(hre.network));
    if (node !== expectedNode) {
      throw new Error(
        `PluginENSSubdomainRegistrar node (${node}) doesn't match expected node (${expectedNode})`
      );
    }
  }

  // check is the correct registry
  {
    const SubdomainRegistry = await PluginENSSubdomainRegistrar.registry();
    console.log('SubdomainRegistry', SubdomainRegistry);
    console.log('PluginRepoRegistryAddress', PluginRepoRegistryAddress);
    if (SubdomainRegistry !== PluginRepoRegistryAddress) {
      throw new Error(
        `${PluginENSSubdomainRegistrar} has wrong Registry set. Expected ${PluginRepoRegistryAddress} to be ${SubdomainRegistry}`
      );
    }
  }

  // VERIFYING PLUGIN REPO FACTORY
  const PluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );
  const PluginRepoFactory = PluginRepoFactory__factory.connect(
    PluginRepoFactoryAddress,
    deployer
  );
  // scope to reuse same const again
  {
    const SetPluginRepoRegistryAddress =
      await PluginRepoFactory.pluginRepoRegistry();
    if (SetPluginRepoRegistryAddress !== PluginRepoRegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong PluginRepoRegistry set. Expected ${SetPluginRepoRegistryAddress} to be ${PluginRepoRegistryAddress}`
      );
    }
  }

  // VERIFYING PSP
  const PluginSetupProcessorAddress = await getContractAddress(
    'PluginSetupProcessor',
    hre
  );
  const PluginSetupProcessor = PluginSetupProcessor__factory.connect(
    PluginSetupProcessorAddress,
    deployer
  );
  // scope to reuse same const again
  {
    const SetPluginRepoRegistryAddress =
      await PluginSetupProcessor.repoRegistry();
    if (SetPluginRepoRegistryAddress !== PluginRepoRegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong PluginRepoRegistry set. Expected ${SetPluginRepoRegistryAddress} to be ${PluginRepoRegistryAddress}`
      );
    }
  }

  // VERIFYING DAO FACTORY
  const DAOFactoryAddress = await getContractAddress('DAOFactory', hre);
  const DAOFactory = DAOFactory__factory.connect(DAOFactoryAddress, deployer);
  // scope to reuse same const again
  {
    const SetDAORegistryAddress = await DAOFactory.daoRegistry();
    if (SetDAORegistryAddress !== DAORegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong DAORegistry set. Expected ${SetDAORegistryAddress} to be ${DAORegistryAddress}`
      );
    }
  }
  // scope to reuse same const again
  {
    const SetPSP = await DAOFactory.pluginSetupProcessor();
    if (SetPSP !== PluginSetupProcessorAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong PluginSetupProcessor set. Expected ${SetPSP} to be ${PluginSetupProcessorAddress}`
      );
    }
  }

  console.log('Framework deployment verified');
};
export default func;
func.tags = [
  'New',
  'ENSSubdomainRegistrar',
  'DAORegistry',
  'PluginRepoRegistry',
  'PluginRepoFactory',
  'PluginSetupProcessor',
  'DAOFactory',
];
