import {DeployFunction} from 'hardhat-deploy/types';
import {EHRE} from '../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding ENS deployment.`);

  const {deployments} = hre;

  const ensRegistry = await deployments.get('ENSRegistry');
  if (ensRegistry) {
    hre.aragonToVerifyContracts.push(ensRegistry);
  }

  const publicResolver = await deployments.get('PublicResolver');
  if (publicResolver) {
    hre.aragonToVerifyContracts.push(publicResolver);
  }

  hre.aragonToVerifyContracts.push(
    await deployments.get('DAO_ENSSubdomainRegistrar')
  );
  hre.aragonToVerifyContracts.push(
    await deployments.get('DAO_ENSSubdomainRegistrar_Implementation')
  );
  hre.aragonToVerifyContracts.push(
    await deployments.get('Plugin_ENSSubdomainRegistrar')
  );
  hre.aragonToVerifyContracts.push(
    await deployments.get('Plugin_ENSSubdomainRegistrar_Implementation')
  );
};

export default func;
func.tags = ['ENSSubdomainRegistrar'];
