import {DeployFunction} from 'hardhat-deploy/types';

import buildMetadataJson from '../../../src/plugins/governance/multisig/build-metadata.json';
import {findEvent} from '../../../utils/event';

import {checkPermission, getContractAddress} from '../../helpers';
import {Operation} from '../../../utils/types';
import {hashHelpers} from '../../../utils/psp';
import {MultisigSetup__factory, Multisig__factory} from '../../../typechain';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {InstallationPreparedEvent} from '../../../typechain/PluginSetupProcessor';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  if (network.name !== 'localhost' && network.name !== 'hardhat') {
    if (
      !('MANAGINGDAO_MULTISIG_LISTEDONLY' in process.env) ||
      !('MANAGINGDAO_MULTISIG_MINAPPROVALS' in process.env) ||
      !('MANAGINGDAO_MULTISIG_APPROVERS' in process.env)
    ) {
      throw new Error('Managing DAO Multisig settings not set in .env');
    }
  }

  const approvers = process.env.MANAGINGDAO_MULTISIG_APPROVERS?.split(',') || [
    deployer.address,
  ];
  const minApprovals = parseInt(
    process.env.MANAGINGDAO_MULTISIG_MINAPPROVALS || '1'
  );
  // In case `MANAGINGDAO_MULTISIG_LISTEDONLY` not present in .env
  // which applies only hardhat/localhost, use `true` setting for extra safety for tests.
  const listedOnly =
    'MANAGINGDAO_MULTISIG_LISTEDONLY' in process.env
      ? process.env.MANAGINGDAO_MULTISIG_LISTEDONLY === 'true'
      : true;

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // Get `PluginSetupProcessor` contract.
  const pspContract = await ethers.getContractAt(
    'PluginSetupProcessor',
    pspAddress
  );

  // Install multisig build 2
  const multisigRepoAddress = hre.aragonPluginRepos['multisig'];
  const versionTag = {
    release: 1,
    build: 2,
  };
  const pluginSetupRef = {
    pluginSetupRepo: multisigRepoAddress,
    versionTag,
  };

  // Prepare multisig plugin for managingDAO
  const data = ethers.utils.defaultAbiCoder.encode(
    buildMetadataJson.pluginSetupABI.prepareInstallation,
    [approvers, [listedOnly, minApprovals]]
  );
  const prepareTx = await pspContract.prepareInstallation(managingDAOAddress, {
    data,
    pluginSetupRef,
  });
  await prepareTx.wait();

  // extract info from prepare event
  const event = await findEvent<InstallationPreparedEvent>(
    prepareTx,
    'InstallationPrepared'
  );
  const installationPreparedEvent = event.args;

  hre.managingDAOMultisigPluginAddress = installationPreparedEvent.plugin;

  console.log(
    `Prepared (Multisig: ${installationPreparedEvent.plugin} version (release: ${versionTag.release} / build: ${versionTag.build}) to be applied on (ManagingDAO: ${managingDAOAddress}), see (tx: ${prepareTx.hash})`
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
      await Multisig__factory.createInterface().encodeFunctionData(
        'initialize',
        [
          managingDAOAddress,
          approvers,
          {
            onlyListed: listedOnly,
            minApprovals: minApprovals,
          },
        ]
      ),
    ],
  });

  // Apply multisig plugin to the managingDAO
  const applyTx = await pspContract.applyInstallation(managingDAOAddress, {
    helpersHash: hashHelpers(
      installationPreparedEvent.preparedSetupData.helpers
    ),
    permissions: installationPreparedEvent.preparedSetupData.permissions,
    plugin: installationPreparedEvent.plugin,
    pluginSetupRef,
  });
  await applyTx.wait();

  await checkPermission(managingDaoContract, {
    operation: Operation.Grant,
    where: {name: 'ManagingDAO', address: managingDAOAddress},
    who: {name: 'Multisig plugin', address: installationPreparedEvent.plugin},
    permission: 'EXECUTE_PERMISSION',
  });

  console.log(
    `Applied (Multisig: ${installationPreparedEvent.plugin}) on (ManagingDAO: ${managingDAOAddress}), see (tx: ${applyTx.hash})`
  );
};
export default func;
func.tags = ['InstallMultisigOnManagingDAO'];
