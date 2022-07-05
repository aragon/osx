import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const managingDAOAddress = await getContractAddress('DAO', hre);
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);
  const tokenFactoryAddress = await getContractAddress('TokenFactory', hre);

  const ret = await deploy('DAOFactory', {
    from: deployer,
    args: [daoRegistryAddress, tokenFactoryAddress],
    log: true,
  });

  const daoFactoryAddress: string = ret.receipt?.contractAddress || '';

  const registerDAORole = ethers.utils.id('REGISTER_DAO_ROLE');

  // Grant REGISTER_DAO_ROLE to DAOFactory
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );
  await managingDaoContract.grant(
    daoRegistryAddress,
    daoFactoryAddress,
    registerDAORole
  );
};
export default func;
func.tags = ['DAOFactory'];
