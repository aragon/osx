import {DeployFunction} from 'hardhat-deploy/types';

import buildMetadataJson from '../../src/plugins/governance/multisig/build-metadata.json';
import {findEvent} from '../../utils/event';

import {checkPermission, getContractAddress} from '../helpers';
import {EHRE, Operation} from '../../utils/types';
import {hashHelpers} from '../../utils/psp';
import {MultisigSetup__factory, Multisig__factory} from '../../typechain';

const func: DeployFunction = async function (hre: EHRE) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

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

  console.log(
    `Prepared (Multisig: ${installationPreparedEvent.plugin}) to be applied on (ManagingDAO: ${managingDAOAddress}), see (tx: ${prepareTx.hash})`
  );

  // Adding plugin to verify array
  const multisigSetupAddress = await getContractAddress('MultisigSetup', hre);
  const multisigSetup = await MultisigSetup__factory.connect(
    multisigSetupAddress,
    deployer
  );
  hre.aragonToVerfiyContracts.push({
    address: installationPreparedEvent.plugin,
    args: [
      await multisigSetup.implementation(),
      await Multisig__factory.createInterface().encodeFunctionData(
        'initialize',
        [managingDAOAddress, approvers, {
          onlyListed: listedOnly,
          minApprovals: minApprovals
        }]
      ),
    ],
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
