import {AdminSetup__factory} from '../../../../typechain';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {setTimeout} from 'timers/promises';
import {skipIfZkSync} from '../../../helpers';

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

  hre.aragonToVerifyContracts.push({
    contract: 'src/plugins/governance/admin/AdminSetup.sol:AdminSetup',
    ...AdminSetupDeployment,
  });
  hre.aragonToVerifyContracts.push({
    contract: 'src/plugins/governance/admin/Admin.sol:Admin',
    address: await adminSetup.implementation(),
    args: [],
  });
};

export default func;
func.tags = ['New', 'AdminSetup', 'Verify'];
func.skip = async hre => await skipIfZkSync(hre, 'AdminSetupConclude');
