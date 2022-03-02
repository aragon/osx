import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {promises as fs} from 'fs';
import {getActiveContractsJSON} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  let allDeployments = await deployments.all();

  const releasesContent = await fs.readFile(
    `${process.env.GITHUB_WORKSPACE || '../../'}/packages/contracts/Releases.md`
  );
  const splitted = releasesContent.toString().split('\n');
  const contractsJson = await getActiveContractsJSON();

  let releasesUpdate = [
    `Time: ${new Date().toISOString()}  `,
    `Commit: [${process.env.GITHUB_SHA}](https://github.com/aragon/zaragoza/commit/${process.env.GITHUB_SHA})  `,
  ];

  for (const contractName of Object.keys(allDeployments)) {
    const contract = allDeployments[contractName];
    if (contract) {
      releasesUpdate.push(`${contractName}: ${contract.address}`);
    }
  }

  for (const contract of Object.keys(contractsJson[hre.network.name])) {
    if (!allDeployments[contract]) {
      releasesUpdate.push(
        `${contract}: ${contractsJson[hre.network.name][contract]}`
      );
    }
  }

  releasesUpdate.push('___  ');

  releasesUpdate = [
    ...splitted.slice(0, 2),
    ...releasesUpdate,
    ...splitted.slice(2),
  ];

  await fs.writeFile(
    `${
      process.env.GITHUB_WORKSPACE || '../../'
    }/packages/contracts/Releases.md`,
    releasesUpdate.join('\n')
  );
};

export default func;
func.tags = ['DAOFactory', 'TokenFactory', 'Registry', 'UpdateReleasesMD'];
func.runAtTheEnd = true;
func.skip = (hre: HardhatRuntimeEnvironment) =>
  Promise.resolve(
    hre.network.name === 'localhost' ||
      hre.network.name === 'hardhat' ||
      hre.network.name === 'coverage'
  );
