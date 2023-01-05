const fs = require('fs/promises');
const path = require('path');

async function main() {
  const networks = await fs.readdir(
    path.join(process.env.GITHUB_WORKSPACE, 'artefacts'),
    {withFileTypes: true}
  );
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
      const manifest = {
        info: '# Do not edit subgraph.yaml,this is a generated file. \n# Instead, edit subgraph.placeholder.yaml and run: yarn manifest',
        network: networkName,
        dataSources: {},
      };

      for (const contract of contracts) {
        let name;
        let dataSourceName;
        if (contract.isFile()) {
          switch (contract.name) {
            case 'DAORegistry.json':
              dataSourceName = 'DAORegistry';
              name = 'DAORegistry';
              break;
            case 'PluginRepoRegistry.json':
              dataSourceName = 'PluginRepoRegistry';
              name = 'PluginRepoRegistry';
              break;
            case 'PluginSetupProcessor.json':
              dataSourceName = 'PluginSetupProcessor';
              name = 'PluginSetupProcessor';
              break;
          }
        }

        if (name && dataSourceName) {
          const contractPath = path.join(networkPath, contract.name);
          const contractContent = await fs.readFile(contractPath);
          const contractJson = JSON.parse(contractContent.toString());
          manifest.dataSources[dataSourceName] = {
            name,
            address: contractJson.address,
            startBlock: contractJson.receipt.blockNumber,
          };
        }
      }

      await fs.writeFile(
        path.join(
          process.env.GITHUB_WORKSPACE,
          `packages/subgraph/manifest/data/${networkName}.json`
        ),
        JSON.stringify(manifest, null, 2)
      );
    }
  }
}

main();
