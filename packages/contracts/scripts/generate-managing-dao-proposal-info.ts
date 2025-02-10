// note using version 1.3.0 due to is the one currently installed on the managing dao change it once it's upgraded
import {Multisig__factory as Multisig_v1_3_0__factory} from '../typechain/@aragon/osx-v1.3.0/plugins/governance/multisig/Multisig.sol';
import {uploadToPinata} from '@aragon/osx-commons-sdk';
import {ethers} from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * This script merges the plugin proposals actions inside the `proposalActionsPath` (./plugin-proposals-data) folder
 * into the `mergedProposalActionsPath` (./merged-proposals.json) file.
 *
 * Steps
 * 1- deploy all needed plugins
 * 2- copy their deployment script to the `scripts/plugin-proposals-data` folder
 * 3- deploy the new osx version (this can be done before deploy the plugins) => this will create a `deployed_contracts.json` file
 * 4- run this script to merge the calldata from each plugin and the framework deployment into a single file
 */

interface Action {
  to: string;
  value: number;
  data: string;
  description: string;
}

interface ProposalAction {
  to: string;
  value: number;
  data: string;
}

const deployedContractsPath = path.join(
  __dirname,
  '../deployed_contracts.json'
);
const proposalActionsPath = path.join(__dirname, './plugin-proposals-data');

const mergedProposalActionsPath = path.join(
  __dirname,
  './merged-proposals.json'
);

const calldataPath = path.join(__dirname, './calldata.json');

function generateProposalJson() {
  try {
    // check if the file exists
    if (!fs.existsSync(deployedContractsPath)) {
      console.error('deployed_contracts.json file not found');
      return;
    }

    const deployedContractsRaw = fs.readFileSync(
      deployedContractsPath,
      'utf-8'
    );
    // load the osx deployed contracts
    const deployedContracts = JSON.parse(deployedContractsRaw);

    // creates the folder if it doesn't exist
    if (!fs.existsSync(proposalActionsPath)) {
      fs.mkdirSync(proposalActionsPath, {recursive: true});
      console.error(
        'plugin-proposals-data folder created, add plugin proposals json to merge them'
      );
      return;
    }

    // read the plugin proposals data
    const proposalFiles = fs
      .readdirSync(proposalActionsPath)
      .filter(file => file.endsWith('.json'));

    if (proposalFiles.length === 0) {
      console.error('No plugin proposals found in plugin-proposals-data');
      return;
    }

    // store each plugin action
    let tmpAction: Action;
    for (const file of proposalFiles) {
      const filePath = path.join(proposalActionsPath, file);
      const dataRaw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(dataRaw);

      console.log(data.actions[0].value === undefined);
      // Validate that the JSON has both 'actions' and 'proposalDescription'
      if (
        !data.actions ||
        !Array.isArray(data.actions) ||
        data.actions.length === 0 ||
        !data.proposalDescription ||
        !data.actions[0].to ||
        data.actions[0].value === undefined ||
        !data.actions[0].data
      ) {
        console.error(
          `File ${file} is missing required fields ('actions' and/or 'proposalDescription'). Skipping.`
        );
        continue;
      }

      tmpAction = {
        to: data.actions[0]?.to,
        value: data.actions[0]?.value,
        data: data.actions[0]?.data,
        description: data.proposalDescription,
      };

      deployedContracts.managementDAOActions.push(tmpAction);
    }

    // write the updated JSON back to a new file
    fs.writeFileSync(
      mergedProposalActionsPath,
      JSON.stringify(deployedContracts, null, 2),
      'utf-8'
    );

    console.log(
      `Successfully created merged-proposals.json with all proposal actions in ${mergedProposalActionsPath}!`
    );
  } catch (error) {
    throw `Error generating proposal JSON: ${error}`;
  }
}

function generateHexCalldataInJson(functionArgs: any[]) {
  try {
    const abi = Multisig_v1_3_0__factory.abi;
    const iface = new ethers.utils.Interface(abi);

    const calldata = iface.encodeFunctionData('createProposal', functionArgs);

    const jsonOutput = {
      functionName: 'createProposal',
      functionArgs: functionArgs,
      calldata: calldata,
    };

    // write the call information in the json file
    fs.writeFileSync(
      calldataPath,
      JSON.stringify(jsonOutput, null, 2),
      'utf-8'
    );
    console.log(
      `Successfully created calldata.json with the function call information in ${calldataPath}!`
    );
  } catch (error) {
    throw `Error encoding function data: ${error}`;
  }
}

async function main() {
  generateProposalJson();

  // get the actions to send it to the createHexCalldata function
  const jsonFile = JSON.parse(
    fs.readFileSync(mergedProposalActionsPath, 'utf-8')
  );

  let args = [];

  if (!jsonFile.managementDAOActions) {
    throw new Error('No actions found in merged-proposals.json');
  }
  // remove the description from the actions
  let proposalActions: ProposalAction[] = [];
  let proposalMetadataFullDescription: string = '';
  jsonFile.managementDAOActions.forEach((action: Action) => {
    proposalActions.push({
      to: action.to,
      value: action.value,
      data: action.data,
    });
    proposalMetadataFullDescription += action.description + ' ';
  });

  // this should be adjusted based on the actual proposal
  if (!jsonFile.proposalInfo) {
    console.error('No proposal info found in merged-proposals.json');
    return 1;
  }

  const metadatata = {
    title: jsonFile.proposalInfo.proposalTitle,
    summary: jsonFile.proposalInfo.proposalSummary,
    description: proposalMetadataFullDescription,
    resources: jsonFile.proposalInfo.proposalResources,
  };

  const metadataCIDPath = await uploadToPinata(
    JSON.stringify(metadatata, null, 2),
    `management-dao-proposal-update-v1.4.0-metadata`
  );

  // push the metadata
  args.push(ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadataCIDPath)));
  // push the actions
  args.push(proposalActions);

  // push allow failure map => to zero
  args.push(0);

  // push approve proposal => to false
  args.push(false);

  // push try execution => to false
  args.push(false);

  // push the start and end dates
  args.push(jsonFile.proposalInfo.proposalStartDate);
  args.push(jsonFile.proposalInfo.proposalEndDate);

  // generate the calldata in a json file
  generateHexCalldataInJson(args);
}

main()
  .then(() => {
    console.log('done!');
  })
  .catch(error => {
    console.error('Error in main:', error);
    process.exit(1);
  });
