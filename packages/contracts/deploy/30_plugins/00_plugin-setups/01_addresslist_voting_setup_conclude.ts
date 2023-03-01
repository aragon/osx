import {DeployFunction} from 'hardhat-deploy/types';
import {AddresslistVotingSetup__factory} from '../../../typechain';
import {EHRE} from '../../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`Concluding addresslist voting setup deployment.\n`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const AddresslistVotingSetupDeployment = await deployments.get(
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
func.tags = ['AddresslistVotingSetup', 'Verify'];
