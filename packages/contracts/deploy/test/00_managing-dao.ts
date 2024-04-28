import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ArtifactData, DeployFunction} from 'hardhat-deploy/types';

import daoArtifactJson from '../../artifacts/src/core/dao/DAO.sol/DAO.json';
import {PluginRepoFactory__factory} from '@aragon/osx-ethers-v1.2.0';
import {getContractAddress} from '../helpers';
import {DAO__factory, Test__factory} from '../../typechain';
/** NOTE:
 * Create a (Managing DAO) with no Plugin, to be the owner DAO for the framework, temporarily.
 */
import pluginRepoFactoryArtifact from '../../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';
import TestArtifact from '../../artifacts/src/Test.sol/Test.json';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying ManagingDao.`);

  const {deployments, ethers, deployer: deployerZksync} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // let tx = await deploy('Test', {
  //   contract: TestArtifact,
  //   from: deployer.address,
  //   args: [],
  //   log: true,
  // });

  // Hardhat-zksync Deployment
  // const t = await deployerZksync.loadArtifact('Test');
  // const b = await deployerZksync.deploy(t, []);
  // const c = await deployerZksync.deploy(t, []);

  // console.log(b.address, c.address, ' omg');
  // Hardhat-deploy deployment
  let tx = await deploy('Test', {
    contract: TestArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });

  // console.log('hardhat-zksync deployed: ', b.address);
  console.log('hardhat-deploy deployed: ', tx.address);

  // const pluginRepoFactoryDeployment = await deployments.get('Test');

  // const pluginRepoFactoryA = Test__factory.connect(
  //   b.address,
  //   await deployerZksync.getWallet()
  // );
  // const pluginRepoFactoryB = Test__factory.connect(tx.address, deployer);

  // try {
  //   const d = await pluginRepoFactoryA.ss();
  //   console.log('zksync worked', d);
  // } catch (err) {
  //   console.log('zksync failed');
  // }

  // try {
  //   const d = await pluginRepoFactoryB.ss();
  //   console.log('hardhat-deploy worked', d);
  // } catch (err) {
  //   console.log('hardhat-deploy failed');
  // }
};
export default func;
func.tags = ['New', 'ManagingDao'];
