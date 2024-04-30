import ensSubdomainRegistrarArtifact from '../../../artifacts/src/framework/utils/ens/ENSSubdomainRegistrar.sol/ENSSubdomainRegistrar.json';
import {DAO__factory, ENSRegistry__factory} from '../../../typechain';
import {daoDomainEnv, pluginDomainEnv} from '../../../utils/environment';
import {getContractAddress, getENSAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('Registrar');

  const {deployments, ethers, network} = hre;
  const {deploy} = deployments;

  const [deployer] = await ethers.getSigners();

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );
  const managementDAO = DAO__factory.connect(managementDAOAddress, deployer);

  const ensRegistryAddress = await getENSAddress(hre);

  const daoDomain = daoDomainEnv(network);
  const pluginDomain = pluginDomainEnv(network);

  const daoNode = ethers.utils.namehash(daoDomain);
  const pluginNode = ethers.utils.namehash(pluginDomain);

  // Get DAO's `DAORegistry` address.
  const daoRegistry = await getContractAddress('DAORegistryProxy', hre);

  await deploy('DAOENSSubdomainRegistrarProxy', {
    contract: ensSubdomainRegistrarArtifact,
    from: deployer.address,
    args: [],
    log: true,
    proxy: {
      owner: deployer.address,
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            managementDAOAddress,
            ensRegistryAddress,
            daoRegistry,
            daoNode,
          ],
        },
      },
    },
  });

  // Get DAO's `DAOENSSubdomainRegistrarProxy` contract.
  const daoSubdomainRegistrarAddress = await getContractAddress(
    'DAOENSSubdomainRegistrarProxy',
    hre
  );

  // Get DAO's `PluginRepoRegistry` address.
  const pluginRepoRegistry = await getContractAddress(
    'PluginRepoRegistryProxy',
    hre
  );

  await deploy('PluginENSSubdomainRegistrarProxy', {
    contract: ensSubdomainRegistrarArtifact,
    from: deployer.address,
    args: [],
    log: true,
    proxy: {
      owner: deployer.address,
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            managementDAOAddress,
            ensRegistryAddress,
            pluginRepoRegistry,
            pluginNode,
          ],
        },
      },
    },
  });

  // Get the `ENSSubdomainRegistrar` proxy contract of the PluginRepoRegistry.
  const pluginSubdomainRegistrarAddress = await getContractAddress(
    'PluginENSSubdomainRegistrarProxy',
    hre
  );

  const ensRegistryContract = ENSRegistry__factory.connect(
    ensRegistryAddress,
    deployer
  );

  const daoRegistrarTX =
    await ensRegistryContract.populateTransaction.setApprovalForAll(
      daoSubdomainRegistrarAddress,
      true
    );
  const pluginRegistrarTX =
    await ensRegistryContract.populateTransaction.setApprovalForAll(
      pluginSubdomainRegistrarAddress,
      true
    );
  const deployerTX =
    await ensRegistryContract.populateTransaction.setApprovalForAll(
      deployer.address,
      true
    );

  const tx = await managementDAO.execute(
    ethers.utils.hexlify(ethers.utils.formatBytes32String('ENS_Permissions')),
    [
      {
        to: daoRegistrarTX.to || '',
        value: daoRegistrarTX.value || '0',
        data: daoRegistrarTX.data || '',
      },
      {
        to: pluginRegistrarTX.to || '',
        value: pluginRegistrarTX.value || '0',
        data: pluginRegistrarTX.data || '',
      },
      {
        to: deployerTX.to || '',
        value: deployerTX.value || '0',
        data: deployerTX.data || '',
      },
    ],
    0
  );
  console.log(`Updating controllers of ENS domains with tx ${tx.hash}`);
  await tx.wait();
};
export default func;
func.tags = ['New', 'ENSSubdomainRegistrars'];
