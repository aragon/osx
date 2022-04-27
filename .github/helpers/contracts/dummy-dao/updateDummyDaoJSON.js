const fs = require('fs/promises');
const path = require('path');

async function main() {
  const networks = await fs.readdir(
    path.join(process.env.GITHUB_WORKSPACE, 'artefacts'),
    {withFileTypes: true}
  );
  const activeDaos = await fs.readFile(
    path.join(process.env.GITHUB_WORKSPACE, 'dummy_daos.json')
  );
  const activeDummyDaosJson = JSON.parse(activeDaos.toString());

  for (const network of networks) {
    if (network.isDirectory()) {
      const networkName = network.name;
      const filePath = path.join(
        process.env.GITHUB_WORKSPACE,
        'artefacts',
        networkName,
        'dummy_daos.json'
      );

      const deployedDaos = await fs.readFile(filePath);
      const networkDaosJson = JSON.parse(deployedDaos.toString());

      console.log(
        'filePath',
        filePath,
        'networkDaosJson of network',
        networkDaosJson[networkName]
      );

      if (!activeDummyDaosJson[networkName]) {
        activeDummyDaosJson[networkName] = {};
      }

      activeDummyDaosJson[networkName] = networkDaosJson[networkName];
    }
  }

  await fs.writeFile(
    path.join(process.env.GITHUB_WORKSPACE, 'dummy_daos.json'),
    JSON.stringify(activeDummyDaosJson, null, 2)
  );
}

main();
