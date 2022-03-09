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
    if (manifest.name.endsWith('.json') && !manifest.name.includes('localhost')) {
      matrix.network.push(manifest.name.split('.')[0]);
    }
  }

  console.log(
    `::set-output name=environment::${isTestnet ? 'staging' : 'production'}`
  );
  console.log(`::set-output name=matrix::${JSON.stringify(matrix)}`);
}

main(process.argv[2]);
