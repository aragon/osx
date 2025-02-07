// note using version 1.3.0 due to is the one currently installed on the managing dao change it once it's upgraded
import {Multisig__factory as Multisig_v1_3_0__factory} from '../typechain/@aragon/osx-v1.3.0/plugins/governance/multisig/Multisig.sol';
import {ethers} from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

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

async function generateProposalJson() {
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

      tmpAction = {
        to: data.actions[0].to,
        value: data.actions[0].value,
        data: data.actions[0].data,
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
      'Successfully created merged-proposals.json with all proposal actions!'
    );
  } catch (error) {
    console.error('Error generating proposal JSON:', error);
    return;
  }
}

export function generateHexCalldataInJson(functionArgs: any[]) {
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
      'Successfully created calldata.json with the function call information!'
    );
  } catch (error) {
    console.error('Error encoding function data:', error);
    throw error;
  }
}

function main() {
  generateProposalJson();

  // get the actions to send it to the createHexCalldata function
  const jsonFile = JSON.parse(
    fs.readFileSync(mergedProposalActionsPath, 'utf-8')
  );

  let args = [];
  // push the metadata
  if (!jsonFile.metadata) {
    console.error('No metadata found in merged-proposals.json');
    return 1;
  }
  args.push(ethers.utils.hexlify(ethers.utils.toUtf8Bytes(jsonFile.metadata)));

  // push the actions
  if (!jsonFile.managementDAOActions) {
    console.error('No actions found in merged-proposals.json');
    return 1;
  }
  // remove the description from the actions
  let proposalActions: ProposalAction[] = [];
  jsonFile.managementDAOActions.forEach((action: Action) => {
    proposalActions.push({
      to: action.to,
      value: action.value,
      data: action.data,
    });
  });
  args.push(proposalActions);

  // push allow failure map
  if (
    jsonFile.allowFailureMap === null ||
    jsonFile.allowFailureMap === undefined
  ) {
    console.error('No allow failure map found in merged-proposals.json');
    return 1;
  }
  args.push(jsonFile.allowFailureMap);

  // push approve proposal
  if (
    jsonFile.approveProposal === null ||
    jsonFile.approveProposal === undefined
  ) {
    console.error('No approve proposal found in merged-proposals.json');
    return 1;
  }
  args.push(jsonFile.approveProposal);

  // push try execution
  if (jsonFile.tryExecution === null || jsonFile.tryExecution === undefined) {
    console.error('No try execution found in merged-proposals.json');
    return 1;
  }
  args.push(jsonFile.tryExecution);

  // push the start and end dates
  if (!jsonFile.startDate || !jsonFile.endDate) {
    console.error('No start or end date found in merged-proposals.json');
    return 1;
  }
  args.push(jsonFile.startDate);
  args.push(jsonFile.endDate);

  // generate the calldata in a json file
  generateHexCalldataInJson(args);
}

main();
