import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import buildMetadataJson from '../../src/plugins/governance/multisig/build-metadata.json';
import {findEvent} from '../../utils/event';
import {hashHelpers} from '../../test/test-utils/psp/hash-helpers';

import {getContractAddress, managePermission, PermissionOp} from '../helpers';

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

  // Grant `ROOT_PERMISSION` to `PluginSetupProcessor`.
  await managePermission({
    permissionOp: PermissionOp.Grant,
    permissionManagerContract: managingDaoContract,
    where: {name: 'DAO', address: managingDAOAddress},
    who: {name: 'PluginSetupProcessor', address: pspAddress},
    permission: 'ROOT_PERMISSION',
  });

  // Grant `APPLY_INSTALLATION_PERMISSION` to `Deployer`.
  await managePermission({
    permissionOp: PermissionOp.Grant,
    permissionManagerContract: managingDaoContract,
    where: {name: 'PluginSetupProcessor', address: pspAddress},
    who: {name: 'Deployer', address: deployer},
    permission: 'APPLY_INSTALLATION_PERMISSION',
  });

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

  // Revoke `ROOT_PERMISSION` from `PluginSetupProcessor`.
  await managePermission({
    permissionOp: PermissionOp.Revoke,
    permissionManagerContract: managingDaoContract,
    where: {name: 'DAO', address: managingDAOAddress},
    who: {name: 'PluginSetupProcessor', address: pspAddress},
    permission: 'ROOT_PERMISSION',
  });

  // Revoke `APPLY_INSTALLATION_PERMISSION` from `Deployer`.
  await managePermission({
    permissionOp: PermissionOp.Revoke,
    permissionManagerContract: managingDaoContract,
    where: {name: 'PluginSetupProcessor', address: pspAddress},
    who: {name: 'Deployer', address: deployer},
    permission: 'APPLY_INSTALLATION_PERMISSION',
  });
};
export default func;
func.tags = ['InstallMultisigOnManagingDAO'];
