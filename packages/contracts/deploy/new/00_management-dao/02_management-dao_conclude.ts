import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding ManagementDao deployment.\n`);

  const {deployments} = hre;

  hre.aragonToVerifyContracts.push(
    await deployments.get('ManagementDAOProxy_Implementation')
  );
  hre.aragonToVerifyContracts.push(await deployments.get('ManagementDAOProxy'));
};

export default func;
func.tags = [
  'New',
  'ManagementDao',
  'ManagementDaoPermissions',
  'Verify',
  'Batch-1',
];
