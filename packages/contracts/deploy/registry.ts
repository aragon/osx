import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const adminDaoAddress = await getContractAddress('DAO', hre);

  await deploy('Registry', {
    from: deployer,
    /* args: [
      pass adminDaoAddress
    ],*/
    log: true,
  });
};
export default func;
func.tags = ['Registry'];
