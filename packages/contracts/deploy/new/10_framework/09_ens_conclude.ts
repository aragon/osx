import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding ENS deployment.\n`);

  const {deployments} = hre;

  try {
    const ensRegistry = await deployments.get('ENSRegistry');
    if (ensRegistry) {
      hre.aragonToVerifyContracts.push(ensRegistry);
    }
  } catch (e) {
    console.log(`No deployment for ENSRegistry found`);
  }

  try {
    const publicResolver = await deployments.get('PublicResolver');
    if (publicResolver) {
      hre.aragonToVerifyContracts.push(publicResolver);
    }
  } catch (e) {
    console.log(`No deployment for PublicResolver found`);
  }

  hre.aragonToVerifyContracts.push(
    await deployments.get('DAOENSSubdomainRegistrarProxy')
  );
  hre.aragonToVerifyContracts.push({
    contract:
      'src/framework/utils/ens/ENSSubdomainRegistrar.sol:ENSSubdomainRegistrar',
    ...(await deployments.get('DAOENSSubdomainRegistrarProxy_Implementation')),
  });
  hre.aragonToVerifyContracts.push(
    await deployments.get('PluginENSSubdomainRegistrarProxy')
  );
  hre.aragonToVerifyContracts.push({
    contract:
      'src/framework/utils/ens/ENSSubdomainRegistrar.sol:ENSSubdomainRegistrar',
    ...(await deployments.get(
      'PluginENSSubdomainRegistrarProxy_Implementation'
    )),
  });
};

export default func;
func.tags = [
  'New',
  'ENSRegistry',
  'ENSSubdomains',
  'ENSSubdomainRegistrars',
  'Verify',
  'Batch-4',
];
