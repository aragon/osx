const {execSync, exec} = require('child_process');

let repos = [
  {
    url: '1',
    type: '2',
    more: '8',
  },
  {
    url: '3',
    type: '4',
    more: '8',
  },
];

// Create the directory for cloning repositories
const cloneDir = 'gio';
execSync(`rm -rf ${cloneDir}`);
execSync(`mkdir -p ${cloneDir}`);

// Clone each repository
for (let i = 0; i < repos.length; i++) {
  const repo = repos[i];
  const repoName = repo.url.split('/').pop().replace('.git', ''); // Extract repo name

  // Change to the clone directory
  execSync(`cd ${cloneDir} && git clone ${repo.url}`);

  console.log(`Cloned ${repo.url} into ${cloneDir}/${repoName}`);

  console.log(`${cloneDir}/${repoName}/${repo.contractDirectory}`);
  execSync(`cd ${cloneDir}/${repoName}/${repo.contractDirectory}`);

  execSync('yarn install --frozen-lockfile');
  execSync('npx hardhat compile');
}
