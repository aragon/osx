const fs = require('fs/promises');
const path = require('path');

async function main(ref) {
  const isTestnet = !ref.endsWith('/main');
  const manifests = await fs.readdir(
    path.join(process.env.GITHUB_WORKSPACE, 'packages/subgraph/manifest/data'),
    {withFileTypes: true}
  );

  const matrix = {network: []};

  for (const manifest of manifests) {
    if (
      manifest.name.endsWith('.json') &&
      !manifest.name.includes('localhost')
    ) {
      matrix.network.push(manifest.name.split('.')[0]);
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
