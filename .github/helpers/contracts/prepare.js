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

  console.log(
    `::set-output name=environment::${isTestnet ? 'staging' : 'production'}`
  );
  console.log(`::set-output name=tags::${isTestnet ? 'Registry' : ''}`);
  console.log(`::set-output name=matrix::${JSON.stringify(matrix)}`);
}

main(process.argv[2]);
