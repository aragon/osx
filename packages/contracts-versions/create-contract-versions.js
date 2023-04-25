const fs = require('fs-extra');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const contractsDir = path.join(__dirname, '../contracts');
const contractVersionsDir = __dirname;
const commitHashes = require('./commit_hashes.json');

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
    const srcArtifacts = path.join(contractsDir, 'artifacts');
    const destArtifacts = path.join(
      contractVersionsDir,
      versionName,
      'artifacts'
    );
    await fs.copy(srcArtifacts, destArtifacts);

    const srcContracts = path.join(contractsDir, 'contracts');
    const destContracts = path.join(
      contractVersionsDir,
      versionName,
      'contracts'
    );
    await fs.copy(srcContracts, destContracts, {
      filter: src => src.endsWith('.sol'),
    });

    const srcActiveContracts = path.join(contractsDir, 'active_contracts.json');
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
  for (const version of commitHashes.versions) {
    await buildContracts(version.commit);
    await copyContracts(version.commit, version.name);
  }

  // Return to the original branch
  await exec('git checkout HEAD', {cwd: contractsDir});
}

createVersions();
