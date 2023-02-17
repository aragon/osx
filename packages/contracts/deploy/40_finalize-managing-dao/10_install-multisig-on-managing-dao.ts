import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import buildMetdataJson from '../../src/plugins/governance/multisig/build-metadata.json';
import {findEvent} from '../../utils/event';
import {hashHelpers} from '../../test/test-utils/psp/hash-helpers';

import {getContractAddress} from '../helpers';

interface Ehre extends HardhatRuntimeEnvironment {
  aragonPluginRepos: {multisig: string};
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  const ehre = hre as Ehre;

  // Get info from .env
  const approvers =
    process.env.MANAGINGDAO_MULTISIG_APPROVERS?.split(',') || [];
  const minApprovals = process.env.MANAGINGDAO_MULTISIG_MINAPPROVALS || 0;
  const listedOnly = process.env.MANAGINGDAO_MULTISIG_LISTEDONLY || false;

  if (!approvers.length || !minApprovals || !listedOnly)
    throw new Error(
      `Some .env settings for managingDAO multisig are not set correctly, see:\n` +
        `(MANAGINGDAO_MULTISIG_APPROVERS no. of addresses: ${approvers.length})\n` +
        `(MANAGINGDAO_MULTISIG_MINAPPROVALS: ${minApprovals})\n` +
        `(MANAGINGDAO_MULTISIG_LISTEDONLY: ${listedOnly})\n`
    );

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
  const multisigRepoAddress = ehre.aragonPluginRepos.multisig;
  const versionTag = [1, 1];
  const pluginSetupRef = [versionTag, multisigRepoAddress];

  // Prepare multisig plugin for managingDAO
  const data = ethers.utils.defaultAbiCoder.encode(
    buildMetdataJson.pluginSetupABI.prepareInstallation,
    [approvers, [listedOnly, minApprovals]]
  );
  const prepareParams = [pluginSetupRef, data];
  const prepareTx = await pspContract.prepareInstallation(
    managingDAOAddress,
    prepareParams
  );
  prepareTx.wait();

  // extract info from prepare event
  const event = await findEvent(prepareTx, 'InstallationPrepared');
  const installationPreparedEvent = event.args;

  // Grant permissions
  const APPLY_INSTALLATION_PERMISSION_ID = ethers.utils.id(
    'APPLY_INSTALLATION_PERMISSION'
  );
  const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');

  // Grant `ROOT_PERMISSION` to `PluginSetupProcessor`.
  const grantRootTx = await managingDaoContract.grant(
    managingDAOAddress,
    pspAddress,
    ROOT_PERMISSION_ID
  );
  await grantRootTx.wait();
  console.log(
    `Granted the ROOT_PERMISSION_ID of (DAO: ${managingDAOAddress}) to (PluginSetupProcessor: ${pspAddress}), see (tx: ${grantRootTx.hash})`
  );

  // Grant `APPLY_INSTALLATION_PERMISSION` to `Deployer`.
  const grantTx = await managingDaoContract.grant(
    pspAddress,
    deployer,
    APPLY_INSTALLATION_PERMISSION_ID
  );
  await grantTx.wait();
  console.log(
    `Granted the APPLY_INSTALLATION_PERMISSION of (PluginSetupProcessor: ${pspAddress}) to (Deployer: ${deployer}), see (tx: ${grantTx.hash})`
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
  applyTx.wait();

  // Revoke `ROOT_PERMISSION` from `PluginSetupProcessor`.
  const revokeRootTx = await managingDaoContract.revoke(
    managingDAOAddress,
    pspAddress,
    ROOT_PERMISSION_ID
  );
  await revokeRootTx.wait();
  console.log(
    `Revoked the ROOT_PERMISSION of (DAO: ${managingDAOAddress}) to (PluginSetupProcessor: ${pspAddress}), see (tx: ${grantRootTx.hash})`
  );

  // Revoke `APPLY_INSTALLATION_PERMISSION` from `Deployer`.
  const revokeTx = await managingDaoContract.revoke(
    pspAddress,
    deployer,
    APPLY_INSTALLATION_PERMISSION_ID
  );
  await revokeTx.wait();
  console.log(
    `Revoked the APPLY_INSTALLATION_PERMISSION of (PluginSetupProcessor: ${pspAddress}) from (Deployer: ${deployer}), see (tx: ${revokeTx.hash})`
  );
};
export default func;
func.tags = ['InstallaMultisigOnManagingDAO'];
