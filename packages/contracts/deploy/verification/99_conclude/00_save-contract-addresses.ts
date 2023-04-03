import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {promises as fs} from 'fs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nPrinting deployed contracts.');
  const {deployments, aragonPluginRepos} = hre;

  const deployedContracts = await deployments.all();
  const deployedContractAddresses: {[index: string]: string} = {};

  for (const deployment in deployedContracts) {
    // skip proxies because they are included twice
    if (!deployment.endsWith('_Proxy')) {
      switch (deployment) {
        case 'DAO':
          deployedContractAddresses['managingDAO'] =
            deployedContracts[deployment].address;
          console.log(`Managing DAO: ${deployedContracts[deployment].address}`);
          break;
        case 'DAO_Implementation':
          deployedContractAddresses['managingDAOImplemenation'] =
            deployedContracts[deployment].address;
          console.log(
            `Managing DAO Implementation: ${deployedContracts[deployment].address}`
          );
          break;
        default:
          deployedContractAddresses[deployment] =
            deployedContracts[deployment].address;
          console.log(
            `${deployment}: ${deployedContracts[deployment].address}`
          );
      }
    }
  }

  for (const pluginRepo in aragonPluginRepos) {
    deployedContractAddresses[`${pluginRepo}-repo`] =
      aragonPluginRepos[pluginRepo];
    console.log(`${pluginRepo}-repo: ${aragonPluginRepos[pluginRepo]}`);
  }

  await fs.writeFile(
    'deployed_contracts.json',
    JSON.stringify(deployedContractAddresses)
  );
};
export default func;
func.tags = ['Conclude'];
func.runAtTheEnd = true;
