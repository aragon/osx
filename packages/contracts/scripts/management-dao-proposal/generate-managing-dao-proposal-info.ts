// note using version 1.3.0 due to is the one currently installed on the managing dao change it once it's upgraded
import {Multisig__factory as Multisig_v1_3_0__factory} from '../../typechain/@aragon/osx-v1.3.0/plugins/governance/multisig/Multisig.sol';
import {uploadToPinata} from '@aragon/osx-commons-sdk';
import dotenv from 'dotenv';
import {ethers} from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({path: path.resolve(__dirname, '../../.env')});

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
  '../../deployed_contracts.json'
);
const proposalActionsPath = path.join(__dirname, './files-to-merge');

const mergedProposalActionsPath = path.join(
  __dirname,
  './generated/merged-proposals.json'
);

const calldataPath = path.join(__dirname, './generated/calldata.json');

function generateProposalJson() {
  // check if the file exists
  if (!fs.existsSync(deployedContractsPath)) {
    throw new Error('deployed_contracts.json file not found');
  }

  const deployedContractsRaw = fs.readFileSync(deployedContractsPath, 'utf-8');
  // load the osx deployed contracts
  const deployedContracts = JSON.parse(deployedContractsRaw);

  // creates the folder if it doesn't exist
  if (!fs.existsSync(proposalActionsPath)) {
    fs.mkdirSync(proposalActionsPath, {recursive: true});

    throw new Error('No plugin proposals found in files-to-merge');
  }

  // read the plugin proposals data
  const proposalFiles = fs
    .readdirSync(proposalActionsPath)
    .filter(file => file.endsWith('.json'));

  if (proposalFiles.length === 0) {
    throw new Error('No plugin proposals found in files-to-merge');
  }

  // store each plugin action
  let tmpAction: Action;
  for (const [index, file] of proposalFiles.entries()) {
    const filePath = path.join(proposalActionsPath, file);
    const dataRaw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(dataRaw);

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

    let proposalDescription = data.proposalDescription;
    if (index === 0) {
      proposalDescription =
        '\n\n# Publish New Plguin Versions' + data.proposalDescription;
    }

    tmpAction = {
      to: data.actions[0]?.to,
      value: data.actions[0]?.value,
      data: data.actions[0]?.data,
      description: proposalDescription,
    };

    deployedContracts.managementDAOActions.push(tmpAction);
  }

  // Create directory if it doesn't exist
  const mergedProposalDir = path.dirname(mergedProposalActionsPath);
  if (!fs.existsSync(mergedProposalDir)) {
    fs.mkdirSync(mergedProposalDir, {recursive: true});
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
}

function generateHexCalldataInJson(functionArgs: any[]) {
  const abi = Multisig_v1_3_0__factory.abi;
  const iface = new ethers.utils.Interface(abi);

  const calldata = iface.encodeFunctionData('createProposal', functionArgs);

  const jsonOutput = {
    functionName: 'createProposal',
    functionArgs: functionArgs,
    calldata: calldata,
  };

  // write the call information in the json file
  fs.writeFileSync(calldataPath, JSON.stringify(jsonOutput, null, 2), 'utf-8');
  console.log(
    `Successfully created calldata.json with the function call information in ${calldataPath}!`
  );
}

async function main() {
  generateProposalJson();

  // Check if merged proposals file exists
  if (!fs.existsSync(mergedProposalActionsPath)) {
    throw new Error(`File not found: ${mergedProposalActionsPath}`);
  }

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
  proposalMetadataFullDescription = '# Protocol Upgrade';
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
    throw new Error('No proposal info found in merged-proposals.json');
  }

  const metadata = {
    title: jsonFile.proposalInfo.proposalTitle,
    summary: jsonFile.proposalInfo.proposalSummary,
    description: proposalMetadataFullDescription,
    resources: jsonFile.proposalInfo.proposalResources,
  };

  if (!process.env.PUB_PINATA_JWT) {
    throw new Error('PUB_PINATA_JWT is not set');
  }

  const metadataCIDPath = await uploadToPinata(
    metadata,
    `management-dao-proposal-update-v1.4.0-metadata`,
    process.env.PUB_PINATA_JWT
  );

  console.log('Uploaded proposal metadata:', metadataCIDPath);

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
