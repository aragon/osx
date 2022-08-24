import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('PluginInstaller', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      owner: deployer,
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      // TODO: set the initialize() once the PluginInstaller is ready.
      // execute: {
      //   init: {
      //     methodName: 'initialize',
      //     args: ['0x00', deployer, ethers.constants.AddressZero],
      //   },
      // },
    },
  });
};
export default func;
func.tags = ['PluginInstaller'];
