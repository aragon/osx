import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  PluginRepo__factory,
  TokenVotingSetup__factory,
} from '../../../typechain';
import {getContractAddress, uploadToIPFS} from '../../helpers';

import tokenVotingReleaseMetadata from '../../../src/plugins/governance/majority-voting/token/release-metadata.json';
import tokenVotingBuildMetadata from '../../../src/plugins/governance/majority-voting/token/build-metadata.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpdate TokenVoting Plugin');
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  const TokenVotingSetup = new TokenVotingSetup__factory(deployer);

  const deployResult = await TokenVotingSetup.deploy();
  console.log('HERE HERE', deployResult.address);

  console.log(network.name);

  const tokenVotingReleaseCIDPath = await uploadToIPFS(
    JSON.stringify(tokenVotingReleaseMetadata),
    network.name
  );
  const tokenVotingBuildCIDPath = await uploadToIPFS(
    JSON.stringify(tokenVotingBuildMetadata),
    network.name
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
        1,
        deployResult.address,
        ethers.utils.toUtf8Bytes(`ipfs://${tokenVotingBuildCIDPath}`),
        ethers.utils.toUtf8Bytes(`ipfs://${tokenVotingReleaseCIDPath}`)
      );
    console.log(`Creating new TokenVoting build version with ${tx.hash}`);
    await tx.wait();
    return;
  }

  const tx = await tokenVotingRepo
    .connect(deployer)
    .populateTransaction.createVersion(
      1,
      deployResult.address,
      ethers.utils.toUtf8Bytes(`ipfs://${tokenVotingBuildCIDPath}`),
      ethers.utils.toUtf8Bytes(`ipfs://${tokenVotingReleaseCIDPath}`)
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
func.tags = ['Update', 'TokenVotingPlugin'];
