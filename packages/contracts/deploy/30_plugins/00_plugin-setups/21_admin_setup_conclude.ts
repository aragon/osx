import {DeployFunction} from 'hardhat-deploy/types';
import { AdminSetup__factory } from '../../../typechain';
import {EHRE} from '../../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding admin setup deployment.`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const AdminSetupDeployment = await deployments.get('AdminSetup');
  const adminSetup = await AdminSetup__factory.connect(
    AdminSetupDeployment.address,
    deployer
  );

  hre.aragonToVerfiyContracts.push(AdminSetupDeployment);
  hre.aragonToVerfiyContracts.push({
    address: await adminSetup.implementation(),
    args: []
  });
};

export default func;
func.tags = ['AdminSetup'];
