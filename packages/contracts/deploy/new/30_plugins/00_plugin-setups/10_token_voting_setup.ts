import tokenVotingSetupArtifact from '../../../../artifacts/src/plugins/governance/majority-voting/token/TokenVotingSetup.sol/TokenVotingSetup.json';
import governanceERC20Artifact from '../../../../artifacts/src/token/ERC20/governance/GovernanceERC20.sol/GovernanceERC20.json';
import governanceWrappedERC20Artifact from '../../../../artifacts/src/token/ERC20/governance/GovernanceWrappedERC20.sol/GovernanceWrappedERC20.json';
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
  const governanceERC20DeployResult = await deploy('GovernanceERC20', {
    contract: governanceERC20Artifact,
    from: deployer.address,
    args: [zeroDaoAddress, emptyName, emptySymbol, emptyMintSettings],
    log: true,
  });

  const governanceWrappedERC20DeployResult = await deploy(
    'GovernanceWrappedERC20',
    {
      contract: governanceWrappedERC20Artifact,
      from: deployer.address,
      args: [zeroTokenAddress, emptyName, emptySymbol],
      log: true,
    }
  );

  // Deploy the TokenVotingSetup and provide the bases in the constructor
  await deploy('TokenVotingSetup', {
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
