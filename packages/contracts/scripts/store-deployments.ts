// import {DeploymentResultsEvent} from '../typechain/DeployFrameworkFactory';
import * as dotenv from 'dotenv';
import {ethers} from 'ethers';

dotenv.config();

const fs = require('fs').promises;

type Record = {
  blockNumber: number;
  deploymentTx: string | null;
  address: string;
};

// Define DeploymentResultsEvent to allow string keys
interface DeploymentResultsEvent {
  [key: string]: Record; // Explicit index signature for string keys
}

const keys = [
  'DAORegistryImplementation',
  'PluginRepoRegistryImplementation',
  'DAOENSSubdomainRegistrarImplementation',
  'PluginENSSubdomainRegistrarImplementation',
  'ManagementDAOImplementation',
  'ManagementDAOProxy',
  'DAOENSSubdomainRegistrarProxy',
  'PluginENSSubdomainRegistrarProxy',
  'DAORegistryProxy',
  'PluginRepoRegistryProxy',
  'PluginSetupProcessor',
  'DAOFactory',
  'PluginRepoFactory',
  'PlaceholderSetup',
  'ENSRegistry',
  'PublicResolver',
];

function findObject(data: any, address: string): string | null {
  address = address.toLowerCase();
  for (const obj of data) {
    // Check the top-level object
    if (obj.contractAddress.toLowerCase() === address) {
      return obj.hash;
    }

    // Check the additionalContracts array if it exists
    if (obj.additionalContracts) {
      const found = obj.additionalContracts.find(
        (subObj: any) => subObj.address.toLowerCase() === address
      );
      if (found) {
        return obj.hash;
      }
    }
  }

  // Return null if no matching object is found
  return null;
}
async function decodeAndFillJson(chainId: string, encoded: string) {
  const decoded = ethers.utils.defaultAbiCoder.decode(['address[]'], encoded);
  const arrayAddr: string[] = decoded[0];

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.NETWORK_RPC_URL
  );

  const content = JSON.parse(
    await fs.readFile(
      `broadcast/FactoryDeploy.sol/${chainId}/dry-run/run-latest.json`,
      'utf8'
    )
  );

  const promises = keys.map(async (key, index) => {
    const addr = arrayAddr[index];

    // Find the transaction hash
    const hash = findObject(content.transactions, addr);

    let data = {
      address: addr,
      blockNumber: 0,
      deploymentTx: null,
    };

    if (!hash) {
      return {
        key,
        data,
      };
    }
    // Fetch transaction details
    const transaction = await provider.getTransaction(hash);

    return {
      key,
      data: {
        address: addr,
        blockNumber: transaction.blockNumber,
        deploymentTx: hash,
      },
    };
  });

  // Wait for all promises to resolve
  const results = await Promise.all(promises);

  // Convert the results into the desired object format
  const addresses: DeploymentResultsEvent = results.reduce((acc, result) => {
    // @ts-ignore
    acc[result.key] = result.data;
    return acc;
  }, {} as DeploymentResultsEvent);

  return addresses;
}

// function
async function storeDeployments() {
  const chainId = process.argv[2];
  const addresses = process.argv[3].replace(/^"(.*)"$/, '$1');

  const json = await decodeAndFillJson(chainId, addresses);

  await fs.writeFile('deployed_contracts.json', JSON.stringify(json, null, 2));
}
(async () => {
  console.log(await storeDeployments());
})();
