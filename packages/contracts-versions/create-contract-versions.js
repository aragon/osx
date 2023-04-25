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

async function buildContracts(commit) {
  try {
    await exec(`git checkout ${commit}`, {cwd: contractsDir});
    await exec('yarn build', {cwd: contractsDir});
  } catch (error) {
    console.error('Error building contracts:', error);
  }
}

async function generateTypechain(commit, versionName) {
  try {
    const srcArtifacts = path.join(contractsDir, 'artifacts/src');
    const destTypechain = path.join(
      contractVersionsDir,
      versionName,
      'contracts'
    );

    await exec(
      `find ${srcArtifacts} -name '*.json' -type f | grep -v '.dbg.json' | xargs typechain --target ethers-v5 --out-dir ${destTypechain}`,
      {cwd: contractsDir}
    );
  } catch (error) {
    console.error('Error generating TypeChain output:', error);
  }
}

async function copyActiveContracts(versionName) {
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
    console.error('Error copying active_contracts.json:', error);
  }
}

async function createVersions() {
  const currentBranch = await getCurrentBranch();

  for (const version of commitHashes.versions) {
    console.log(
      `Building contracts for version: ${version.name}, with commit: ${version.commit}`
    );
    await buildContracts(version.commit);
    await generateTypechain(version.commit, version.name);
    await copyActiveContracts(version.name);
  }

  // Return to the original branch
  await exec(`git checkout ${currentBranch}`, {cwd: contractsDir});
}

createVersions();
