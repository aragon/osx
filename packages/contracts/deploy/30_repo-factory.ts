import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const adminDaoAddress = await getContractAddress('DAO', hre);
  const aragonPluginRegistryAddress = await getContractAddress(
    'AragonPluginRegistry',
    hre
  );

  const ret = await deploy('RepoFactory', {
    from: deployer,
    args: [aragonPluginRegistryAddress],
    log: true,
  });

  const repoFactoryAddress: string = ret.receipt?.contractAddress || '';
  const registerRole =
    '0xd1f21ec03a6eb050fba156f5316dad461735df521fb446dd42c5a4728e9c70fe';

  // Grant REGISTER_ROLE to repo factory
  const adminDaoContract = await ethers.getContractAt('DAO', adminDaoAddress);
  await adminDaoContract.grant(
    aragonPluginRegistryAddress,
    repoFactoryAddress,
    registerRole
  );
};
export default func;
func.runAtTheEnd = true;
func.tags = ['AragonPluginRegistry'];
