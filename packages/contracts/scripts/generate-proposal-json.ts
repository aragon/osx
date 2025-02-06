import * as fs from 'fs';
import * as path from 'path';

interface Action {
  to: string;
  value: number;
  data: string;
  description: string;
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

generateProposalJson();
