const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const monorepoRoot = path.join(__dirname, '../..');
const contractsDir = path.join(monorepoRoot, 'packages/contracts');
const contractVersionsDir = path.join(__dirname, 'versions');
const commitHashes = require('./commit_hashes.json');

async function getCurrentBranch() {
  const {stdout} = await exec('git branch --show-current', {cwd: contractsDir});
  return stdout.trim();
}

async function buildContracts(commit: string) {
  try {
    await exec(`git checkout ${commit}`, {cwd: contractsDir});
    await exec('yarn build', {cwd: contractsDir});
  } catch (error) {
    console.error('Error building contracts:', error);
  }
}

async function copyActiveContracts(versionName: string) {
  try {
    console.log(`Copying contracts source code`);
    const srcContracts = path.join(contractsDir, 'src');
    const destContracts = path.join(
      contractVersionsDir,
      versionName,
      'contracts'
    );
    await fs.copy(srcContracts, destContracts);

    console.log(`Copying active_contracts.json`);
    const srcActiveContracts = path.join(monorepoRoot, 'active_contracts.json');
    const destActiveContracts = path.join(
      contractVersionsDir,
      versionName,
      'active_contracts.json'
    );
    await fs.copy(srcActiveContracts, destActiveContracts);
  } catch (error) {
    console.error(
      'Error copying contracts source code and active contracts:',
      error
    );
  }
}

async function createVersions() {
  const currentBranch = await getCurrentBranch();

  for (const version in commitHashes.versions) {
    const versionCommit = commitHashes.versions[version] as string;
    const versionName = version;

    console.log(
      `Building contracts for version: ${versionName}, with commit: ${versionCommit}`
    );
    await buildContracts(versionCommit);
    await copyActiveContracts(versionName);
  }

  // Return to the original branch
  await exec(`git checkout ${currentBranch}`, {cwd: contractsDir});

  // Generate npm/index.ts file
  const exports: string[] = [];
  for (const version in commitHashes.versions) {
    const versionName = version;
    exports.push(
      `import * as ${versionName}_active_contracts from '../versions/${versionName}/active_contracts.json';`
    );
  }
  exports.push(
    `export { ${Object.keys(commitHashes.versions)
      .map(versionName => `${versionName}_active_contracts`)
      .join(', ')} };`
  );

  const npmDir = path.join(__dirname, 'npm');
  await fs.ensureDir(npmDir);
  await fs.writeFile(path.join(npmDir, 'index.ts'), exports.join('\n'));
}

createVersions();
