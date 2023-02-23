import {DeployFunction} from 'hardhat-deploy/types';
import {AddresslistVotingSetup__factory} from '../../../typechain';
import {EHRE} from '../../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding addresslist voting setup deployment.`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const AddresslistVotingSetupDeployment = await deployments.get(
    'AddresslistVotingSetup'
  );
  const addresslistVotingSetup = await AddresslistVotingSetup__factory.connect(
    AddresslistVotingSetupDeployment.address,
    deployer
  );

  hre.aragonToVerfiyContracts.push(AddresslistVotingSetupDeployment);
  hre.aragonToVerfiyContracts.push({
    address: await addresslistVotingSetup.implementation(),
    args: [],
  });
};

export default func;
func.tags = ['AddresslistVotingSetup'];
