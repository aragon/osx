import tokenVotingSetupArtifact from '../../../../artifacts/src/zksync/TokenVotingSetupZkSync.sol/TokenVotingSetupZkSync.json';
import governanceERC20UpgradeableArtifact from '../../../../artifacts/src/zksync/GovernanceERC20Upgradeable.sol/GovernanceERC20Upgradeable.json';
import governanceWrappedERC20UpgradeableArtifact from '../../../../artifacts/src/zksync/GovernanceWrappedERC20Upgradeable.sol/GovernanceWrappedERC20Upgradeable.json';
import {MintSettings} from '../../../../test/token/erc20/governance-erc20';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const zeroDaoAddress = ethers.constants.AddressZero;
  const zeroTokenAddress = ethers.constants.AddressZero;
  const emptyName = '';
  const emptySymbol = '';
  const emptyMintSettings: MintSettings = {
    receivers: [],
    amounts: [],
  };

  // Deploy the bases for the TokenVotingSetup
  const governanceERC20DeployResult = await deploy('GovernanceERC20Upgradeable', {
    contract: governanceERC20UpgradeableArtifact,
    from: deployer.address,
    args: [zeroDaoAddress, emptyName, emptySymbol, emptyMintSettings],
    log: true,
  });

  const governanceWrappedERC20DeployResult = await deploy(
    'GovernanceWrappedERC20Upgradeable',
    {
      contract: governanceWrappedERC20UpgradeableArtifact,
      from: deployer.address,
      args: [zeroTokenAddress, emptyName, emptySymbol],
      log: true,
    }
  );

  // Deploy the TokenVotingSetup and provide the bases in the constructor
  await deploy('TokenVotingSetupZkSync', {
    contract: tokenVotingSetupArtifact,
    from: deployer.address,
    args: [
      governanceERC20DeployResult.address,
      governanceWrappedERC20DeployResult.address,
    ],
    log: true,
  });
};
export default func;
func.tags = ['New', 'TokenVotingSetup'];
// Skip if network is not zksync
func.skip = (hre: HardhatRuntimeEnvironment) =>
    Promise.resolve(
        hre.network.name !== 'zkTestnet' &&
        hre.network.name !== 'zkLocalTestnet' &&
        hre.network.name !== 'zkMainnet'
    );
  