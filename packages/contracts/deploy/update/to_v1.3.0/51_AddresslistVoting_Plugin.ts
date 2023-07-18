import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {PluginRepo__factory} from '../../../typechain';
import {getContractAddress, uploadToIPFS} from '../../helpers';

import addresslistVotingSetupArtifact from '../../../artifacts/src/plugins/governance/majority-voting/addresslist/AddresslistVotingSetup.sol/AddresslistVotingSetup.json';
import addresslistVotingReleaseMetadata from '../../../src/plugins/governance/majority-voting/addresslist/release-metadata.json';
import addresslistVotingBuildMetadata from '../../../src/plugins/governance/majority-voting/addresslist/build-metadata.json';

const TARGET_RELEASE = 1;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpdate AddresslistVoting Plugin');
  const {deployments, ethers, network} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const deployResult = await deploy('AddresslistVotingSetup', {
    contract: addresslistVotingSetupArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });

  const addresslistVotingReleaseCIDPath = await uploadToIPFS(
    JSON.stringify(addresslistVotingReleaseMetadata),
    network.name
  );
  const addresslistVotingBuildCIDPath = await uploadToIPFS(
    JSON.stringify(addresslistVotingBuildMetadata),
    network.name
  );

  const addresslistVotingRepoAddress = await getContractAddress(
    'address-list-voting-repo',
    hre
  );
  const addresslistVotingRepo = PluginRepo__factory.connect(
    addresslistVotingRepoAddress,
    ethers.provider
  );
  if (
    await addresslistVotingRepo.callStatic.isGranted(
      addresslistVotingRepoAddress,
      deployer.address,
      await addresslistVotingRepo.MAINTAINER_PERMISSION_ID(),
      '0x00'
    )
  ) {
    console.log(
      `Deployer has permission to install new AddresslistVoting version`
    );
    const tx = await addresslistVotingRepo
      .connect(deployer)
      .createVersion(
        TARGET_RELEASE,
        deployResult.address,
        ethers.utils.toUtf8Bytes(`ipfs://${addresslistVotingBuildCIDPath}`),
        ethers.utils.toUtf8Bytes(`ipfs://${addresslistVotingReleaseCIDPath}`)
      );
    console.log(`Creating new AddresslistVoting build version with ${tx.hash}`);
    await tx.wait();
    return;
  }

  const tx = await addresslistVotingRepo
    .connect(deployer)
    .populateTransaction.createVersion(
      TARGET_RELEASE,
      deployResult.address,
      ethers.utils.toUtf8Bytes(`ipfs://${addresslistVotingBuildCIDPath}`),
      ethers.utils.toUtf8Bytes(`ipfs://${addresslistVotingReleaseCIDPath}`)
    );

  if (!tx.to || !tx.data) {
    throw new Error(
      `Failed to populate AddresslistVoting Repo createVersion transaction`
    );
  }

  console.log(
    `Deployer has no permission to create a new version. Adding managingDAO action`
  );
  hre.managingDAOActions.push({
    to: tx.to,
    data: tx.data,
    value: 0,
    description: `Creates a new build for release 1 in the AddresslistVotingRepo (${addresslistVotingRepoAddress}) with AddresslistVotingSetup (${deployResult.address})`,
  });
};
export default func;
func.tags = ['Update', 'AddresslistVotingPlugin', 'v1.3.0'];
