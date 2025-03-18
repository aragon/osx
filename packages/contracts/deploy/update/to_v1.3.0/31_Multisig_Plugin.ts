import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {PluginRepo__factory} from '../../../typechain';
import {getContractAddress, uploadToIPFS} from '../../helpers';

import multisigSetupArtifact from '../../../artifacts/src/plugins/governance/multisig/MultisigSetup.sol/MultisigSetup.json';

import multisigReleaseMetadata from '../../../src/plugins/governance/multisig/release-metadata.json';
import multisigBuildMetadata from '../../../src/plugins/governance/multisig/build-metadata.json';
import { uploadToPinata } from '@aragon/osx-commons-sdk';

const TARGET_RELEASE = 1;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpdate Multisig Plugin');
  const {deployments, ethers, network} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const deployResult = await deploy('MultisigSetup', {
    contract: multisigSetupArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });

  if (!process.env.PUB_PINATA_JWT) {
    throw new Error('PUB_PINATA_JWT is not set');
  }

  const multisigReleaseCIDPath = await uploadToPinata(
    JSON.stringify(multisigReleaseMetadata),
    `multisigReleaseMetadata`,
    process.env.PUB_PINATA_JWT
  );

  const multisigBuildCIDPath = await uploadToPinata(
    JSON.stringify(multisigBuildMetadata),
    `multisigBuildMetadata`,
    process.env.PUB_PINATA_JWT
  );

  const multisigRepoAddress = await getContractAddress('multisig-repo', hre);
  const multisigRepo = PluginRepo__factory.connect(
    multisigRepoAddress,
    ethers.provider
  );
  if (
    await multisigRepo.callStatic.isGranted(
      multisigRepoAddress,
      deployer.address,
      await multisigRepo.MAINTAINER_PERMISSION_ID(),
      '0x00'
    )
  ) {
    console.log(`Deployer has permission to install new multisig version`);
    const tx = await multisigRepo
      .connect(deployer)
      .createVersion(
        TARGET_RELEASE,
        deployResult.address,
        ethers.utils.toUtf8Bytes(`${multisigBuildCIDPath}`),
        ethers.utils.toUtf8Bytes(`${multisigReleaseCIDPath}`)
      );
    console.log(`Creating new multisig build version with ${tx.hash}`);
    await tx.wait();
    return;
  }

  const tx = await multisigRepo
    .connect(deployer)
    .populateTransaction.createVersion(
      TARGET_RELEASE,
      deployResult.address,
      ethers.utils.toUtf8Bytes(`${multisigBuildCIDPath}`),
      ethers.utils.toUtf8Bytes(`${multisigReleaseCIDPath}`)
    );

  if (!tx.to || !tx.data) {
    throw new Error(
      `Failed to populate multisigRepo createVersion transaction`
    );
  }

  console.log(
    `Deployer has no permission to create a new version. Adding managingDAO action`
  );
  hre.managingDAOActions.push({
    to: tx.to,
    data: tx.data,
    value: 0,
    description: `Creates a new build for release 1 in the MultisigRepo (${multisigRepoAddress}) with MultisigSetup (${deployResult.address})`,
  });
};
export default func;
func.tags = ['MultisigPlugin', 'v1.3.0'];
