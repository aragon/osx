const fs = require('fs/promises');
const path = require('path');

async function main() {
  const networks = await fs.readdir(
    path.join(process.env.GITHUB_WORKSPACE, 'artefacts'),
    {withFileTypes: true}
  );
  const activeContracts = await fs.readFile(
    path.join(process.env.GITHUB_WORKSPACE, 'active_contracts.json')
  );
  const activeContractsJson = JSON.parse(activeContracts.toString());

  for (const network of networks) {
    if (network.isDirectory()) {
      const networkName = network.name;
      const networkPath = path.join(
        process.env.GITHUB_WORKSPACE,
        'artefacts',
        networkName,
        networkName
      );

      const contracts = await fs.readdir(networkPath, {withFileTypes: true});
      for (const contract of contracts) {
        if (contract.isFile() && contract.name.endsWith('.json')) {
          const contractName = contract.name.split('.')[0];
          const contractPath = path.join(networkPath, contract.name);
          const contractContent = await fs.readFile(contractPath);
          const contractJson = JSON.parse(contractContent.toString());
          const contractAddr = contractJson.address;

          if (!activeContractsJson[networkName]) {
            activeContractsJson[networkName] = {};
          }

          activeContractsJson[networkName][contractName] = contractAddr;
        }
      }
    }
  }

  await fs.writeFile(
    path.join(process.env.GITHUB_WORKSPACE, 'active_contracts.json'),
    JSON.stringify(activeContractsJson, null, 2)
  );
}

main();
