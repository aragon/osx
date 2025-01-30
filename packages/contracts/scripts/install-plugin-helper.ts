import {DAO, DAO__factory, PluginSetupProcessor__factory} from '../typechain';
import {hashHelpers} from '../utils/psp';
import {
  findEvent,
  getNamedTypesFromMetadata,
  isIpfsCid,
} from '@aragon/osx-commons-sdk';
import * as dotenv from 'dotenv';
import {ethers} from 'ethers';
import * as readline from 'readline';

const fs = require('fs').promises;

dotenv.config();

const ROOT_PERMISSION = ethers.utils.id('ROOT_PERMISSION');
const EXECUTE_PERMISSION = ethers.utils.id('EXECUTE_PERMISSION');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to wrap `rl.question()` in a Promise
function askQuestion(query: any): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

function smartParse(input: any) {
  input = input.trim();

  try {
    // ✅ If it's valid JSON, parse directly (handles ["0x...", "string"] case correctly)
    return JSON.parse(input);
  } catch (error) {
    // ✅ If JSON.parse() fails, try manual parsing for non-quoted values
    if (input.startsWith('[') && input.endsWith(']')) {
      const elements = input
        .slice(1, -1)
        .split(',')
        .map((el: any) => el.trim());

      const formattedElements = elements.map((el: any) => {
        if (/^0x[a-fA-F0-9]+$/.test(el)) {
          return `"${el}"`; // Wrap Ethereum addresses in quotes
        } else if (!isNaN(el) && el !== '') {
          return el; // Keep numbers unchanged
        } else {
          return `"${el.replace(/"/g, '\\"')}"`; // Wrap everything else in quotes
        }
      });

      const formattedString = `[${formattedElements.join(',')}]`;

      try {
        return JSON.parse(formattedString); // Parse manually formatted JSON
      } catch (err) {
        throw new Error('Invalid array input format.');
      }
    }

    return input; // If it's not an array, return as-is
  }
}

function formatInput(input: any, depth = 0) {
  let text = `${'\t'.repeat(depth)}${
    input.description ?? input.name ?? 'No description'
  } (${input.type}): \n`;

  if (input.type.startsWith('tuple')) {
    input.components.forEach((component: any) => {
      text += formatInput(component, depth + 1); // 🔄 Recursive call
    });
  }

  return text;
}

const repoABI = [
  'function getLatestVersion(uint8) public view returns (tuple(tuple(uint8,uint16),address,bytes))',
  'function MAINTAINER_PERMISSION_ID() public view returns(bytes32)',
  'function getVersion(tuple(uint8,uint16) version) public view returns (tuple(tuple(uint8,uint16),address,bytes))',
];

async function main() {
  console.log(`Using ${process.env.NETWORK_RPC_URL} for rpc`);

  const pluginRepoAddr = await askQuestion(
    'Provide plugin repo address which you want to install: '
  );
  if (!ethers.utils.isAddress(pluginRepoAddr)) {
    throw new Error('Argument pluginRepoAddress is not a valid address');
  }

  const release = parseInt(await askQuestion('Provide a release number: '));

  const provider = new ethers.Wallet(
    process.env.PRIVATE_KEY ?? '0x',
    new ethers.providers.JsonRpcProvider(process.env.NETWORK_RPC_URL)
  );

  let repoContract = new ethers.Contract(pluginRepoAddr, repoABI, provider);
  let version = await repoContract.getLatestVersion(release);
  let build = version[0][1];

  let providedBuild = await askQuestion(
    `Latest build is: ${version[0][1]}, click enter to use it or provide a number: `
  );

  //   0x56e2c7E24714A2648B66De331F0cBd83dA5D4c35
  if (providedBuild) {
    if (parseInt(providedBuild) > build) {
      throw new Error("build number you provided doesn't exist...");
    }

    build = providedBuild;
    version = await repoContract.getVersion([release, build]);
  }

  console.log(
    `Using ${pluginRepoAddr} with release: ${release} and build: ${build}...`
  );

  const fileName = `deployed-contracts.json`;
  let addresses;
  try {
    addresses = JSON.parse(await fs.readFile(fileName, 'utf8'));
  } catch {
    throw new Error(`File ${fileName} can not be found`);
  }

  const daoAddr: string = addresses['ManagementDAOProxy'].address;
  const pspAddr: string = addresses['PluginSetupProcessor'].address;

  console.log('blax dao', daoAddr);
  console.log('blax psp', pspAddr);

  const buildMetadata = version[2];
  const cid = ethers.utils.toUtf8String(buildMetadata).replace('ipfs://', '');

  console.log(`Fetching cid: ${cid}`);
  if (!isIpfsCid(cid)) {
    throw new Error(`${cid} is not a valid cid`);
  }

  const url = `https://ipfs.io/ipfs/${cid}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch IPFS content: ${response.statusText}`);
  }

  const buildMetadataJSON = JSON.parse(await response.json());
  const prepareinstallationInputs =
    buildMetadataJSON?.pluginSetup?.prepareInstallation?.inputs;

  if (prepareinstallationInputs == undefined) {
    throw new Error('installation inputs are not defined in metadata...');
  }

  console.log(
    'starting to gather all necessary data for the plugin installation'
  );

  const args = [];
  for (const [i, input] of prepareinstallationInputs.entries()) {
    let text = formatInput(input);

    const answer = smartParse(await askQuestion(text)); // ✅ Waits for user input
    console.log(`Provided: ${JSON.stringify(answer)}`); // ✅ This is the output Makefile can capture

    args.push(answer);
  }

  rl.close();

  console.log('Your Final Provided Parameters: ', args);

  const encodedData = ethers.utils.defaultAbiCoder.encode(
    getNamedTypesFromMetadata(prepareinstallationInputs),
    args
  );

  // Merge abis so we can catch event from PSP.
  const pspABI = PluginSetupProcessor__factory.abi;
  const daoABI = DAO__factory.abi;

  // @ts-ignore
  const mergedABI = daoABI.concat(pspABI);
  const dao = new ethers.Contract(daoAddr, mergedABI, provider) as DAO;

  if (
    !(await dao.hasPermission(
      dao.address,
      provider.address,
      EXECUTE_PERMISSION,
      '0x'
    ))
  ) {
    throw new Error("You don't have permission to execute on the dao...");
  }

  const setupRef = {
    versionTag: {
      release,
      build,
    },
    pluginSetupRepo: pluginRepoAddr,
  };

  const tx = await dao.execute(
    ethers.constants.HashZero,
    [
      {
        to: pspAddr,
        value: 0,
        data: PluginSetupProcessor__factory.createInterface().encodeFunctionData(
          // @ts-ignore
          'prepareInstallation',
          [daoAddr, [setupRef, encodedData]]
        ),
      },
    ],
    0
  );

  const event = findEvent(await tx.wait(), 'InstallationPrepared');
  if (!event.args || event.args.length == 0) throw new Error('Event is wrong.');

  const plugin = event.args[6];
  const preparedSetupData = event.args[7];
  const permissions = preparedSetupData[1];
  const helpers = preparedSetupData[0];

  const applyActions = [
    {
      to: daoAddr,
      value: 0,
      data: DAO__factory.createInterface().encodeFunctionData('grant', [
        daoAddr,
        pspAddr,
        ROOT_PERMISSION,
      ]),
    },
    {
      to: pspAddr,
      value: 0,
      data: PluginSetupProcessor__factory.createInterface().encodeFunctionData(
        // @ts-ignore
        'applyInstallation',
        [daoAddr, [setupRef, plugin, permissions, hashHelpers(helpers)]]
      ),
    },
    {
      to: daoAddr,
      value: 0,
      data: DAO__factory.createInterface().encodeFunctionData('revoke', [
        daoAddr,
        pspAddr,
        ROOT_PERMISSION,
      ]),
    },
    {
      to: daoAddr,
      value: 0,
      data: DAO__factory.createInterface().encodeFunctionData('revoke', [
        daoAddr,
        provider.address,
        EXECUTE_PERMISSION,
      ]),
    },
  ];

  await dao.execute(ethers.constants.HashZero, applyActions, 0);

  const hasPermission = await dao.hasPermission(
    daoAddr,
    provider.address,
    EXECUTE_PERMISSION,
    '0x'
  );

  if (!hasPermission) {
    console.log(
      'Successfully installed the plugin and revoked permission from deployer...'
    );
    return;
  }

  throw new Error('FAIL... Something went wrong....');
}

(async () => {
  console.log(await main());
})();
