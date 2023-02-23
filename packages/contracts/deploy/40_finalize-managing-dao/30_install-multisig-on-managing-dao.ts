import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import buildMetadataJson from '../../src/plugins/governance/multisig/build-metadata.json';
import {findEvent} from '../../utils/event';

import {checkPermission, getContractAddress} from '../helpers';
import {EHRE, Operation} from '../../utils/types';
import {hashHelpers} from '../../utils/psp';

const func: DeployFunction = async function (hre: EHRE) {
  const {ethers, network, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  let approvers: string[];
  let minApprovals: number;
  let listedOnly: boolean;

  // Get info from .env
  let MANAGINGDAO_MULTISIG_APPROVERS: string | undefined =
    process.env.MANAGINGDAO_MULTISIG_APPROVERS;
  let MANAGINGDAO_MULTISIG_MINAPPROVALS: string | undefined =
    process.env.MANAGINGDAO_MULTISIG_MINAPPROVALS;
  let MANAGINGDAO_MULTISIG_LISTEDONLY: string | undefined =
    process.env.MANAGINGDAO_MULTISIG_LISTEDONLY;

  if (
    !MANAGINGDAO_MULTISIG_APPROVERS ||
    !MANAGINGDAO_MULTISIG_MINAPPROVALS ||
    !MANAGINGDAO_MULTISIG_LISTEDONLY
  ) {
    if (network.name === 'localhost' || network.name === 'hardhat') {
      MANAGINGDAO_MULTISIG_APPROVERS = deployer;
      MANAGINGDAO_MULTISIG_MINAPPROVALS = '1';
      MANAGINGDAO_MULTISIG_LISTEDONLY = 'false';
    } else {
      throw new Error(
        `Some .env settings for managingDAO multisig are not set correctly, see:\n` +
          `(MANAGINGDAO_MULTISIG_APPROVERS: ${MANAGINGDAO_MULTISIG_APPROVERS})\n` +
          `(MANAGINGDAO_MULTISIG_MINAPPROVALS: ${MANAGINGDAO_MULTISIG_MINAPPROVALS})\n` +
          `(MANAGINGDAO_MULTISIG_LISTEDONLY: ${MANAGINGDAO_MULTISIG_LISTEDONLY})\n`
      );
    }
  }

  if (typeof MANAGINGDAO_MULTISIG_APPROVERS !== 'string') {
    throw new Error(
      `Some .env settings for managingDAO multisig are not set correctly, see:\n` +
        `(MANAGINGDAO_MULTISIG_APPROVERS: ${MANAGINGDAO_MULTISIG_APPROVERS})\n`
    );
  } else {
    approvers = MANAGINGDAO_MULTISIG_APPROVERS?.split(',');
  }

  if (isNaN(parseInt(MANAGINGDAO_MULTISIG_MINAPPROVALS))) {
    throw new Error(
      `Some .env settings for managingDAO multisig are not set correctly, see:\n` +
        `(MANAGINGDAO_MULTISIG_MINAPPROVALS: ${MANAGINGDAO_MULTISIG_MINAPPROVALS})\n`
    );
  } else {
    minApprovals = parseInt(MANAGINGDAO_MULTISIG_MINAPPROVALS);
  }

  listedOnly = MANAGINGDAO_MULTISIG_LISTEDONLY === 'true';

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

  // Installing multisig
  const multisigRepoAddress = hre.aragonPluginRepos.multisig;
  const versionTag = [1, 1];
  const pluginSetupRef = [versionTag, multisigRepoAddress];

  // Prepare multisig plugin for managingDAO
  const data = ethers.utils.defaultAbiCoder.encode(
    buildMetadataJson.pluginSetupABI.prepareInstallation,
    [approvers, [listedOnly, minApprovals]]
  );
  const prepareParams = [pluginSetupRef, data];
  const prepareTx = await pspContract.prepareInstallation(
    managingDAOAddress,
    prepareParams
  );
  await prepareTx.wait();

  // extract info from prepare event
  const event = await findEvent(prepareTx, 'InstallationPrepared');
  const installationPreparedEvent = event.args;

  hre.managingDAOMultisigPluginAddress = installationPreparedEvent.plugin;

  console.log(
    `Prepared (Multisig: ${installationPreparedEvent.plugin}) to be applied on (ManagingDAO: ${managingDAOAddress}), see (tx: ${prepareTx.hash})`
  );

  // Apply multisig plugin to the managingDAO
  const applyParams = [
    pluginSetupRef,
    installationPreparedEvent.plugin,
    installationPreparedEvent.preparedSetupData.permissions,
    hashHelpers(installationPreparedEvent.preparedSetupData.helpers),
  ];
  const applyTx = await pspContract.applyInstallation(
    managingDAOAddress,
    applyParams
  );
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
