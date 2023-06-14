import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DAO__factory, ENSRegistry__factory} from '../../../typechain';
import {getContractAddress, getENSAddress} from '../../helpers';

import ensSubdomainRegistrarArtifact from '../../../artifacts/src/framework/utils/ens/ENSSubdomainRegistrar.sol/ENSSubdomainRegistrar.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, network} = hre;
  const {deploy} = deployments;

  const [deployer] = await ethers.getSigners();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);
  const managingDAO = DAO__factory.connect(managingDAOAddress, deployer);

  const ensRegistryAddress = await getENSAddress(hre);

  const daoDomain =
    process.env[`${network.name.toUpperCase()}_DAO_ENS_DOMAIN`] || '';
  const pluginDomain =
    process.env[`${network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`] || '';
  const daoNode = ethers.utils.namehash(daoDomain);
  const pluginNode = ethers.utils.namehash(pluginDomain);

  if (!daoDomain || !pluginDomain) {
    throw new Error('DAO or Plugin ENS domains have not been set in .env');
  }

  await deploy('DAO_ENSSubdomainRegistrar', {
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
          args: [managingDAOAddress, ensRegistryAddress, daoNode],
        },
      },
    },
  });

  // Get DAO's `ENSSubdomainRegistrar` contract.
  const daoSubdomainRegistrarAddress = await getContractAddress(
    'DAO_ENSSubdomainRegistrar',
    hre
  );

  await deploy('Plugin_ENSSubdomainRegistrar', {
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
          args: [managingDAOAddress, ensRegistryAddress, pluginNode],
        },
      },
    },
  });

  // Get PluginRepoRegistry's `ENSSubdomainRegistrar` contract.
  const pluginSubdomainRegistrarAddress = await getContractAddress(
    'Plugin_ENSSubdomainRegistrar',
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

  const tx = await managingDAO.execute(
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
