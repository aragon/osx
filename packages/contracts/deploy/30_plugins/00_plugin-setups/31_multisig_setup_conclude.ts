import {DeployFunction} from 'hardhat-deploy/types';
import {MultisigSetup__factory} from '../../../typechain';
import {EHRE} from '../../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`Concluding multisig setup deployment.\n`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const MultisigSetupDeployment = await deployments.get('MultisigSetup');
  const multisigSetup = MultisigSetup__factory.connect(
    MultisigSetupDeployment.address,
    deployer
  );

  hre.aragonToVerifyContracts.push(MultisigSetupDeployment);
  hre.aragonToVerifyContracts.push({
    address: await multisigSetup.implementation(),
    args: [],
  });
};

export default func;
func.tags = ['MultisigSetup', 'Verify'];
