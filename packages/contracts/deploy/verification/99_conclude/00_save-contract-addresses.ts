import {promises as fs} from 'fs';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nPrinting deployed contracts.');
  const {deployments, aragonPluginRepos} = hre;

  const deployedContracts = await deployments.all();
  const deployedContractAddresses: {[index: string]: string} = {};

  for (const deployment in deployedContracts) {
    // skip proxies because they are included twice
    if (!deployment.endsWith('_Proxy')) {
      switch (deployment) {
        case 'ManagementDAOProxy':
          deployedContractAddresses['ManagementDAOProxy'] =
            deployedContracts[deployment].address;
          console.log(
            `Management DAO: ${deployedContracts[deployment].address}`
          );
          break;
        case 'ManagementDAOProxy_Implementation':
          deployedContractAddresses['ManagementDAOProxyImplementation'] =
            deployedContracts[deployment].address;
          console.log(
            `Management DAO Implementation: ${deployedContracts[deployment].address}`
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
    deployedContractAddresses[pluginRepo] = aragonPluginRepos[pluginRepo];
    console.log(`${pluginRepo}: ${aragonPluginRepos[pluginRepo]}`);
  }

  await fs.writeFile(
    'deployed_contracts.json',
    JSON.stringify(deployedContractAddresses)
  );
};
export default func;
func.tags = ['New', 'Conclude', 'ConcludeEnd'];
func.runAtTheEnd = true;
