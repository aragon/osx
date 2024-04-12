import buildMetadataJson from '../../../src/plugins/governance/multisig/build-metadata.json';
import {
  DAO__factory,
  MultisigSetup__factory,
  Multisig__factory,
  PluginSetupProcessor__factory,
} from '../../../typechain';
import {InstallationPreparedEvent} from '../../../typechain/PluginSetupProcessor';
import {
  isLocal,
  managementDaoMultisigApproversEnv,
  managementDaoMultisigMinApprovalsEnv,
} from '../../../utils/environment';
import {hashHelpers} from '../../../utils/psp';
import {checkPermission, getContractAddress} from '../../helpers';
import {findEvent} from '@aragon/osx-commons-sdk';
import {Operation} from '@aragon/osx-commons-sdk';
import {getNamedTypesFromMetadata} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  if (!isLocal(network)) {
    if (
      !('MANAGEMENT_DAO_MULTISIG_LISTEDONLY' in process.env) ||
      !('MANAGEMENT_DAO_MULTISIG_MINAPPROVALS' in process.env) ||
      !('MANAGEMENT_DAO_MULTISIG_APPROVERS' in process.env)
    ) {
      throw new Error('Management DAO Multisig settings not set in .env');
    }
  }

  const approvers = managementDaoMultisigApproversEnv(network).split(',');
  const minApprovals = parseInt(
    managementDaoMultisigMinApprovalsEnv(hre.network)
  );
  // In case `MANAGEMENT_DAO_MULTISIG_LISTEDONLY` not present in .env
  // which applies only hardhat/localhost, use `true` setting for extra safety for tests.
  const listedOnly =
    'MANAGEMENT_DAO_MULTISIG_LISTEDONLY' in process.env
      ? process.env.MANAGEMENT_DAO_MULTISIG_LISTEDONLY === 'true'
      : true;

  // Get `ManagementDAOProxy` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAO` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // Get `PluginSetupProcessor` contract.
  const pspContract = PluginSetupProcessor__factory.connect(
    pspAddress,
    deployer
  );

  // Install multisig build 2
  const multisigRepoAddress = hre.aragonPluginRepos.MultisigRepoProxy; // TODO
  const versionTag = {
    release: 1,
    build: 2,
  };
  const pluginSetupRef = {
    pluginSetupRepo: multisigRepoAddress,
    versionTag,
  };

  // Prepare multisig plugin for managementDAO
  const data = ethers.utils.defaultAbiCoder.encode(
    getNamedTypesFromMetadata(
      buildMetadataJson.pluginSetup.prepareInstallation.inputs
    ),
    [approvers, [listedOnly, minApprovals]]
  );
  const prepareTx = await pspContract.prepareInstallation(
    managementDAOAddress,
    {
      data,
      pluginSetupRef,
    }
  );
  await prepareTx.wait();

  // extract info from prepare event
  const event = await findEvent<InstallationPreparedEvent>(
    prepareTx,
    'InstallationPrepared'
  );
  const installationPreparedEvent = event.args;

  hre.managementDAOMultisigPluginAddress = installationPreparedEvent.plugin;

  console.log(
    `Prepared (Multisig: ${installationPreparedEvent.plugin} version (release: ${versionTag.release} / build: ${versionTag.build}) to be applied on (ManagementDAO: ${managementDAOAddress}), see (tx: ${prepareTx.hash})`
  );

  // Adding plugin to verify array
  const multisigSetupAddress = await getContractAddress('MultisigSetup', hre);
  const multisigSetup = MultisigSetup__factory.connect(
    multisigSetupAddress,
    deployer
  );
  hre.aragonToVerifyContracts.push({
    address: installationPreparedEvent.plugin,
    args: [
      await multisigSetup.implementation(),
      Multisig__factory.createInterface().encodeFunctionData('initialize', [
        managementDAOAddress,
        approvers,
        {
          onlyListed: listedOnly,
          minApprovals: minApprovals,
        },
      ]),
    ],
  });

  // Apply multisig plugin to the managementDAO
  const applyTx = await pspContract.applyInstallation(managementDAOAddress, {
    helpersHash: hashHelpers(
      installationPreparedEvent.preparedSetupData.helpers
    ),
    permissions: installationPreparedEvent.preparedSetupData.permissions,
    plugin: installationPreparedEvent.plugin,
    pluginSetupRef,
  });
  await applyTx.wait();

  await checkPermission(managementDaoContract, {
    operation: Operation.Grant,
    where: {name: 'ManagementDAO', address: managementDAOAddress},
    who: {name: 'Multisig plugin', address: installationPreparedEvent.plugin},
    permission: 'EXECUTE_PERMISSION',
  });

  console.log(
    `Applied (Multisig: ${installationPreparedEvent.plugin}) on (ManagementDAO: ${managementDAOAddress}), see (tx: ${applyTx.hash})`
  );
};
export default func;
func.tags = ['New', 'InstallMultisigOnManagementDAO'];
