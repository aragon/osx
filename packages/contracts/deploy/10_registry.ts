import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const ret = await deploy('DAORegistry', {
    from: deployer,
    log: true,
  });

  const managingDAOAddress = await getContractAddress('DAO', hre);

  const registryAddress: string = ret.receipt?.contractAddress || '';

  if (registryAddress !== '') {
    const registryContract = await ethers.getContractAt(
      'DAORegistry',
      registryAddress
    );
    await registryContract.initialize(managingDAOAddress);
  }
};
export default func;
func.tags = ['DAORegistry'];
