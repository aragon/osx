import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {promises as fs} from 'fs';
import {DAOFactory} from '../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nPrinting deployed contracts.');
  const {deployments, aragonPluginRepos, ethers} = hre;

  const deployedContracts = await deployments.all();
  const deployedContractDetails: {[index: string]: any} = {};

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
          deployedContractDetails['managingDAO'] = contractDetails;
          console.log(`Managing DAO: ${JSON.stringify(contractDetails)}`);
          break;
        case 'DAO_Implementation':
          deployedContractDetails['managingDAOImplementation'] =
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

          deployedContractDetails['DAOBase'] = {
            address: daoBaseAddress,
            blockNumber: contractDetails.blockNumber,
            deploymentTx: contractDetails.deploymentTx,
          };
          console.log(`DAOBase: ${daoBaseAddress}`);
          break;
        default:
          deployedContractDetails[deploymentName] = contractDetails;
          console.log(`${deploymentName}: ${JSON.stringify(contractDetails)}`);
      }
    }
  }

  for (const pluginRepo in aragonPluginRepos) {
    deployedContractDetails[`${pluginRepo}-repo`] = {
      address: aragonPluginRepos[pluginRepo].address,
      blockNumber: aragonPluginRepos[pluginRepo].blockNumber,
      deploymentTx: aragonPluginRepos[pluginRepo].transactionHash,
    };
    console.log(
      `${pluginRepo}-repo: ${JSON.stringify(
        deployedContractDetails[`${pluginRepo}-repo`]
      )}`
    );
  }

  await fs.writeFile(
    'deployed_contracts_detailed.json',
    JSON.stringify(deployedContractDetails, null, 2)
  );
};

export default func;
func.tags = ['New', 'Conclude'];
func.runAtTheEnd = true;
