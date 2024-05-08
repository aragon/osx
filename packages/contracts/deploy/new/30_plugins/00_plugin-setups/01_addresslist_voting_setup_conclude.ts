import {AddresslistVotingSetup__factory} from '../../../../typechain';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {setTimeout} from 'timers/promises';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding addresslist voting setup deployment.\n`);
  const {deployments, network, ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const AddresslistVotingSetupDeployment = await deployments.get(
    'AddresslistVotingSetup'
  );
  const addresslistVotingSetup = AddresslistVotingSetup__factory.connect(
    AddresslistVotingSetupDeployment.address,
    deployer
  );

  // add a timeout for polygon because the call to `implementation()` can fail for newly deployed contracts in the first few seconds
  if (network.name === 'polygon') {
    console.log(`Waiting 30secs for ${network.name} to finish up...`);
    await setTimeout(30000);
  }

  hre.aragonToVerifyContracts.push({
    contract:
      'src/plugins/governance/majority-voting/addresslist/AddresslistVotingSetup.sol:AddresslistVotingSetup',
    ...AddresslistVotingSetupDeployment,
  });
  hre.aragonToVerifyContracts.push({
    contract:
      'src/plugins/governance/majority-voting/addresslist/AddresslistVoting.sol:AddresslistVoting',
    address: await addresslistVotingSetup.implementation(),
    args: [],
  });
};

export default func;
func.tags = ['New', 'AddresslistVotingSetup', 'Verify'];
