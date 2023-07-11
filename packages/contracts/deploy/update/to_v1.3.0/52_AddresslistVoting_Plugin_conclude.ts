import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {UPDATE_INFOS} from '../../../utils/updates';
import {AddresslistVotingSetup__factory} from '../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding AddresslistVoting Plugin Update');
  const [deployer] = await hre.ethers.getSigners();

  const AddresslistVotingSetupDeployment = await hre.deployments.get(
    'AddresslistVotingSetup'
  );
  const addresslistVotingSetup = AddresslistVotingSetup__factory.connect(
    AddresslistVotingSetupDeployment.address,
    deployer
  );

  hre.aragonToVerifyContracts.push(AddresslistVotingSetupDeployment);
  hre.aragonToVerifyContracts.push({
    address: await addresslistVotingSetup.implementation(),
    args: [],
  });
};
export default func;
func.tags = ['AddresslistVotingPlugin', 'Verify'].concat(
  UPDATE_INFOS['v1_3_0'].tags
);
