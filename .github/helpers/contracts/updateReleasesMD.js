const fs = require('fs/promises');
const path = require('path');

async function main() {
  const releasesContent = await fs.readFile(
    path.join(process.env.GITHUB_WORKSPACE, 'packages/contracts/Releases.md')
  );
  const splitted = releasesContent.toString().split('\n');

  let releasesUpdate = [];

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

      releasesUpdate = releasesUpdate.concat([
        `Time: ${new Date().toISOString()}  `,
        `Commit: [${process.env.GITHUB_SHA}](https://github.com/aragon/osx/commit/${process.env.GITHUB_SHA})  `,
        `Network: ${networkName}  `,
      ]);

      const contracts = await fs.readdir(networkPath, {withFileTypes: true});
      for (const contract of contracts) {
        if (contract.isFile() && contract.name.endsWith('.json')) {
          const contractName = contract.name.split('.')[0];
          const contractPath = path.join(networkPath, contract.name);
          const contractContent = await fs.readFile(contractPath);
          const contractJson = JSON.parse(contractContent.toString());
          const contractAddr = contractJson.address;

          releasesUpdate.push(`${contractName}: ${contractAddr}`);
        }
      }

      releasesUpdate.push('___  ');
    }
  }

  releasesUpdate = [
    ...splitted.slice(0, 2),
    ...releasesUpdate,
    ...splitted.slice(2),
  ];

  await fs.writeFile(
    path.join(process.env.GITHUB_WORKSPACE, 'packages/contracts/Releases.md'),
    releasesUpdate.join('\n')
  );
}

main();
