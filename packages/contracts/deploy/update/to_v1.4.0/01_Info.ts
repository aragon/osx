import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nInfo: Updating to version 1.4.0');

  hre.proposalInfo = {
    proposalTitle: 'Upgrade OSx Protocol to version 1.4.0',
    proposalSummary:
      'Upgrade OSx Protocol to version 1.4.0, and release Admin Plugin v1.2, Multisig v1.3 and TokenVoting v1.3',
    proposalResources: [
      {
        name: 'audit report',
        url: 'https://github.com/aragon/osx/tree/main/audits',
      },
    ],
    // Adjust this values
    proposalStartDate: 0,
    proposalEndDate: 1748773409, // Date and time (GMT): Sunday, 1 June 2025 10:23:29
  };
};
export default func;
func.tags = ['Info', 'v1.4.0'];
func.dependencies = ['Env'];
