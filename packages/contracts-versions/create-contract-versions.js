const fs = require('fs-extra');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const monorepoRoot = path.join(__dirname, '../..');
const contractsDir = path.join(monorepoRoot, 'packages/contracts');
const contractVersionsDir = path.join(__dirname, 'dist');
const commitHashes = require('./commit_hashes.json');

async function getCurrentBranch() {
  const {stdout} = await exec('git branch --show-current', {cwd: contractsDir});
  return stdout.trim();
}

async function buildContracts(commit) {
  try {
    await exec(`git checkout ${commit}`, {cwd: contractsDir});
    await exec('yarn build', {cwd: contractsDir});
  } catch (error) {
    console.error('Error building contracts:', error);
  }
}

async function copyContracts(commit, versionName) {
  try {
    console.log(`Copying typechain`);
    const srcTypechain = path.join(contractsDir, 'typechain');
    const destTypechain = path.join(
      contractVersionsDir,
      versionName,
      'contracts'
    );
    await fs.copy(srcTypechain, destTypechain);

    console.log(`Copying active_contracts.json`);
    const srcActiveContracts = path.join(monorepoRoot, 'active_contracts.json');
    const destActiveContracts = path.join(
      contractVersionsDir,
      versionName,
      'active_contracts.json'
    );
    await fs.copy(srcActiveContracts, destActiveContracts);
  } catch (error) {
    console.error('Error copying contracts:', error);
  }
}

async function createVersions() {
  const currentBranch = await getCurrentBranch();

  for (const version of commitHashes.versions) {
    console.log(
      `Building contracts for version: ${version.name}, with commit: ${version.commit}`
    );
    await buildContracts(version.commit);
    await copyContracts(version.commit, version.name);
  }

  // Return to the original branch
  await exec(`git checkout ${currentBranch}`, {cwd: contractsDir});
}

createVersions();
