import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {PluginRepo__factory} from '../../../typechain';
import {getContractAddress, uploadToIPFS} from '../../helpers';

import governanceERC20Artifact from '../../../artifacts/src/token/ERC20/governance/GovernanceERC20.sol/GovernanceERC20.json';
import governanceWrappedERC20Artifact from '../../../artifacts/src/token/ERC20/governance/GovernanceWrappedERC20.sol/GovernanceWrappedERC20.json';
import tokenVotingSetupArtifact from '../../../artifacts/src/plugins/governance/majority-voting/token/TokenVotingSetup.sol/TokenVotingSetup.json';
import tokenVotingReleaseMetadata from '../../../src/plugins/governance/majority-voting/token/release-metadata.json';
import tokenVotingBuildMetadata from '../../../src/plugins/governance/majority-voting/token/build-metadata.json';
import {MintSettings} from '../../../test/token/erc20/governance-erc20';
import { uploadToPinata } from '@aragon/osx-commons-sdk';

const TARGET_RELEASE = 1;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpdate TokenVoting Plugin');
  const {deployments, ethers, network} = hre;
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
  const deployResult = await deploy('TokenVotingSetup', {
    contract: tokenVotingSetupArtifact,
    from: deployer.address,
    args: [
      governanceERC20DeployResult.address,
      governanceWrappedERC20DeployResult.address,
    ],
    log: true,
  });

  if (!process.env.PUB_PINATA_JWT) {
    throw new Error('PUB_PINATA_JWT is not set');
  }

  const tokenVotingReleaseCIDPath = await uploadToPinata(
    JSON.stringify(tokenVotingReleaseMetadata),
    `tokenVotingReleaseMetadata`,
    process.env.PUB_PINATA_JWT
  );

  const tokenVotingBuildCIDPath = await uploadToPinata(
    JSON.stringify(tokenVotingBuildMetadata),
    `tokenVotingBuildMetadata`,
    process.env.PUB_PINATA_JWT
  );

  const tokenVotingRepoAddress = await getContractAddress(
    'token-voting-repo',
    hre
  );
  const tokenVotingRepo = PluginRepo__factory.connect(
    tokenVotingRepoAddress,
    ethers.provider
  );
  if (
    await tokenVotingRepo.callStatic.isGranted(
      tokenVotingRepoAddress,
      deployer.address,
      await tokenVotingRepo.MAINTAINER_PERMISSION_ID(),
      '0x00'
    )
  ) {
    console.log(`Deployer has permission to install new TokenVoting version`);
    const tx = await tokenVotingRepo
      .connect(deployer)
      .createVersion(
        TARGET_RELEASE,
        deployResult.address,
        ethers.utils.toUtf8Bytes(`${tokenVotingBuildCIDPath}`),
        ethers.utils.toUtf8Bytes(`${tokenVotingReleaseCIDPath}`)
      );
    console.log(`Creating new TokenVoting build version with ${tx.hash}`);
    await tx.wait();
    return;
  }

  const tx = await tokenVotingRepo
    .connect(deployer)
    .populateTransaction.createVersion(
      TARGET_RELEASE,
      deployResult.address,
      ethers.utils.toUtf8Bytes(`${tokenVotingBuildCIDPath}`),
      ethers.utils.toUtf8Bytes(`${tokenVotingReleaseCIDPath}`)
    );

  if (!tx.to || !tx.data) {
    throw new Error(
      `Failed to populate TokenVoting Repo createVersion transaction`
    );
  }

  console.log(
    `Deployer has no permission to create a new version. Adding managingDAO action`
  );
  hre.managingDAOActions.push({
    to: tx.to,
    data: tx.data,
    value: 0,
    description: `Creates a new build for release 1 in the TokenVotingRepo (${tokenVotingRepoAddress}) with TokenVotingSetup (${deployResult.address})`,
  });
};
export default func;
func.tags = ['Update', 'TokenVotingPlugin', 'v1.3.0'];
