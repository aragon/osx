import {DeployFunction} from 'hardhat-deploy/types';
import {EHRE} from '../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding ENS deployment.`);

  const {deployments} = hre;

  const ensRegistry = await deployments.get('ENSRegistry');
  if (ensRegistry) {
    hre.aragonToVerfiyContracts.push({
      address: ensRegistry.address,
      args: ensRegistry.args,
    });
  }

  const publicResolver = await deployments.get('PublicResolver');
  if (publicResolver) {
    hre.aragonToVerfiyContracts.push({
      address: publicResolver.address,
      args: publicResolver.args,
    });
  }
  const pluginPublicResolver = await deployments.get('Plugin_PublicResolver');
  if (pluginPublicResolver) {
    hre.aragonToVerfiyContracts.push({
      address: pluginPublicResolver.address,
      args: pluginPublicResolver.args,
    });
  }

  hre.aragonToVerfiyContracts.push(
    await deployments.get('DAO_ENSSubdomainRegistrar')
  );
  hre.aragonToVerfiyContracts.push(
    await deployments.get('DAO_ENSSubdomainRegistrar_Implementation')
  );
  hre.aragonToVerfiyContracts.push(
    await deployments.get('Plugin_ENSSubdomainRegistrar')
  );
  hre.aragonToVerfiyContracts.push(
    await deployments.get('Plugin_ENSSubdomainRegistrar_Implementation')
  );
};

export default func;
func.tags = ['ENSSubdomainRegistrar'];
