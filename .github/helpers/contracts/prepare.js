const fs = require('fs/promises');
const path = require('path');

async function main(ref) {
  const isTestnet = !ref.endsWith('/main');
  const networks = await fs.readFile(
    path.join(process.env.GITHUB_WORKSPACE, 'packages/contracts/networks.json')
  );
  const networksJson = JSON.parse(networks.toString());

  const matrix = {network: []};
  for (const network of Object.keys(networksJson)) {
    if (networksJson[network].isTestnet === isTestnet) {
      matrix.network.push(network);
    }
  }

  await fs.appendFile(
    process.env.GITHUB_OUTPUT,
    `environment=${
      isTestnet ? 'staging' : 'production'
    }\nmatrix=${JSON.stringify(matrix)}\n`
  );
}

main(process.argv[2]);
