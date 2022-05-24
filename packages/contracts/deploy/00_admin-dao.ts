import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

/** NOTE:
 * Create an Admin Dao with no Plugin, to be the owner of Dao and Apm registry.
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const ret = await deploy('DAO', {
    from: deployer,
    log: true,
  });

  const daoAddress: string = ret.receipt?.contractAddress || '';

  if (daoAddress !== '') {
    const daoContract = await ethers.getContractAt('DAO', daoAddress);
    await daoContract.initialize(
      '0x00',
      deployer,
      '0x0000000000000000000000000000000000000000'
    );
    console.log('Admin DAO Contract initialized');
  }
};
export default func;
func.tags = ['DaoAdmin'];
