const fs = require('fs-extra');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const monorepoRoot = path.join(__dirname, '../..');
const contractsDir = path.join(monorepoRoot, 'packages/contracts');
const contractVersionsDir = path.join(__dirname, 'build');
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

async function copyActiveContracts(commit: string, versionName: string) {
  try {
    console.log(`Copying active_contracts.json`);
    const srcActiveContracts = path.join(monorepoRoot, 'active_contracts.json');
    const destActiveContracts = path.join(
      contractVersionsDir,
      versionName,
      'active_contracts.json'
    );
    await fs.copy(srcActiveContracts, destActiveContracts);
  } catch (error) {
    console.error('Error copying active contracts:', error);
  }
}

async function generateTypechain(src: string, dest: string) {
  try {
    // Find all the .json files, excluding the .dbg.json files, in all subdirectories
    const {stdout} = await exec(
      `find "${src}" -name '*.json' -type f -not -path '*.dbg.json'`
    );
    const jsonFiles = stdout
      .trim()
      .split('\n')
      .map((file: string) => `"${file}"`) // Added type annotation here
      .join(' ');

    // Run typechain for all .json files at once
    await exec(`typechain --target ethers-v5 --out-dir "${dest}" ${jsonFiles}`);
  } catch (error) {
    console.error('Error generating TypeChain output:', error);
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
    await copyActiveContracts(versionCommit, versionName);

    const srcArtifacts = path.join(contractsDir, 'artifacts/src');
    const destTypechain = path.join(contractVersionsDir, versionName, 'types');
    await generateTypechain(srcArtifacts, destTypechain);
  }

  // Return to the original branch
  await exec(`git checkout ${currentBranch}`, {cwd: contractsDir});
}

createVersions();
