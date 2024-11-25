import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {promises as fs} from 'fs';
import {DAOFactory, IPluginSetup, PluginRepoFactory} from '../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nPrinting deployed contracts.');
  const {deployments, aragonPluginRepos, ethers} = hre;

  const deployedContracts = await deployments.all();
  const deployedContractDetails: {[index: string]: any} = {};

  let pluginRepoBaseDetail: any;

  for (const deploymentName in deployedContracts) {
    // Skip proxies because they are included twice
    if (!deploymentName.endsWith('_Proxy')) {
      const deployment = deployedContracts[deploymentName];
      const {address, transactionHash, receipt} = deployment;

      const contractDetails = {
        address,
        blockNumber: receipt?.blockNumber || null,
        deploymentTx: transactionHash || null,
      };

      switch (deploymentName) {
        case 'DAO':
          deployedContractDetails['ManagementDAOProxy'] = contractDetails;
          console.log(`Managing DAO: ${JSON.stringify(contractDetails)}`);
          break;

        case 'DAO_Implementation':
          deployedContractDetails['ManagementDAOImplementation'] =
            contractDetails;
          console.log(
            `Managing DAO Implementation: ${JSON.stringify(contractDetails)}`
          );
          break;

        case 'DAOFactory':
          deployedContractDetails[deploymentName] = contractDetails;
          console.log(`${deploymentName}: ${JSON.stringify(contractDetails)}`);

          // Call DAOFactory to get daoBase() address
          const daoFactory = (await ethers.getContractAt(
            'DAOFactory',
            address
          )) as DAOFactory;
          const daoBaseAddress = await daoFactory.daoBase();

          pluginRepoBaseDetail = {
            address: daoBaseAddress,
            blockNumber: contractDetails.blockNumber,
            deploymentTx: contractDetails.deploymentTx,
          };

          deployedContractDetails['DAOBase'] = pluginRepoBaseDetail;

          console.log(`DAOBase: ${daoBaseAddress}`);
          break;

        case 'PluginRepoFactory':
          deployedContractDetails[deploymentName] = contractDetails;
          console.log(`${deploymentName}: ${JSON.stringify(contractDetails)}`);

          // Call DAOFactory to get daoBase() address
          const pluginRepoFactory = (await ethers.getContractAt(
            'PluginRepoFactory',
            address
          )) as PluginRepoFactory;
          const pluginRepoBaseAddress =
            await pluginRepoFactory.pluginRepoBase();

          deployedContractDetails['PluginRepoBase'] = {
            address: pluginRepoBaseAddress,
            blockNumber: contractDetails.blockNumber,
            deploymentTx: contractDetails.deploymentTx,
          };
          console.log(`PluginRepoBase: ${pluginRepoBaseAddress}`);
          break;

        case 'AdminSetup':
        case 'MultisigSetup':
        case 'TokenVotingSetup':
        case 'AddresslistVotingSetup': {
          deployedContractDetails[deploymentName] = contractDetails;
          console.log(`${deploymentName}: ${JSON.stringify(contractDetails)}`);

          // Fetch the implementation address for the plugin setup
          const contract = (await ethers.getContractAt(
            deploymentName,
            address
          )) as IPluginSetup;
          const implementationAddress = await contract.implementation();

          deployedContractDetails[`${deploymentName}Implementation`] = {
            address: implementationAddress,
            blockNumber: contractDetails.blockNumber,
            deploymentTx: contractDetails.deploymentTx,
          };

          console.log(
            `${deploymentName} Implementation: ${JSON.stringify(
              deployedContractDetails[`${deploymentName}Implementation`]
            )}`
          );
          break;
        }

        default:
          // Check and clean up the deployment name if it contains '_'
          let cleanDeploymentName = deploymentName;
          if (deploymentName.includes('_')) {
            cleanDeploymentName = deploymentName.replace(/_/g, ''); // Remove all underscores
          }

          // Append 'Proxy' to specific names
          const proxyNames = [
            'PluginRepoRegistry',
            'PluginENSSubdomainRegistrar',
            'DAOENSSubdomainRegistrar',
            'DAORegistry',
          ];

          if (proxyNames.includes(cleanDeploymentName)) {
            // Add 'Proxy' suffix
            cleanDeploymentName = `${cleanDeploymentName}Proxy`;
          }

          // Store the deployment details under the cleaned-up name
          deployedContractDetails[cleanDeploymentName] = contractDetails;

          console.log(`${deploymentName}: ${JSON.stringify(contractDetails)}`);
      }
    }
  }

  for (const pluginRepo in aragonPluginRepos) {
    const formatedRepoKey = formatReposKey(pluginRepo);
    deployedContractDetails[`${formatedRepoKey}Proxy`] = {
      address: aragonPluginRepos[pluginRepo].address,
      blockNumber: aragonPluginRepos[pluginRepo].blockNumber,
      deploymentTx: aragonPluginRepos[pluginRepo].transactionHash,
    };
    console.log(
      `${formatedRepoKey}Proxy: ${JSON.stringify(
        deployedContractDetails[`${formatedRepoKey}Proxy`]
      )}`
    );

    // Store PluginRepoBase as `formatedRepoKey` + `implementation`
    deployedContractDetails[`${formatedRepoKey}Implementation`] =
      pluginRepoBaseDetail;
  }

  await fs.writeFile(
    'deployed_contracts_detailed.json',
    JSON.stringify(deployedContractDetails, null, 2)
  );
};

function formatReposKey(pluginRepo: string): string {
  return (
    pluginRepo
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join('') + 'Repo'
  ); // Append "Repo"
}

export default func;
func.tags = ['New', 'Conclude'];
func.runAtTheEnd = true;
