import {DeployFunction} from 'hardhat-deploy/types';
import {AdminSetup__factory} from '../../../../typechain';
import {setTimeout} from 'timers/promises';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding admin setup deployment.\n`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments, network} = hre;

  const AdminSetupDeployment = await deployments.get('AdminSetup');
  const adminSetup = AdminSetup__factory.connect(
    AdminSetupDeployment.address,
    deployer
  );

  // add a timeout for polygon because the call to `implementation()` can fail for newly deployed contracts in the first few seconds
  if (network.name === 'polygon') {
    console.log(`Waiting 30secs for ${network.name} to finish up...`);
    await setTimeout(30000);
  }

  hre.aragonToVerifyContracts.push(AdminSetupDeployment);
  hre.aragonToVerifyContracts.push({
    address: await adminSetup.implementation(),
    args: [],
  });
};

export default func;
func.tags = ['AdminSetup', 'Verify'];
