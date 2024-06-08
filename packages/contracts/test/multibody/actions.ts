import {ethers} from 'ethers';
import {
  DAO,
  DAO__factory,
  IDAO,
  MultiBody__factory,
  MultisigV2__factory,
  PluginA__factory,
  PluginSetupProcessor__factory,
} from '../../typechain';

export function multibodyPrepareInstallation(
  pspAddr: string,
  daoAddr: string,
  multibodyPluginRepoAddr: string
): any {
  return {
    to: pspAddr,
    value: 0,
    data: PluginSetupProcessor__factory.createInterface().encodeFunctionData(
      'prepareInstallation',
      [
        daoAddr,
        {
          pluginSetupRef: {
            versionTag: {
              release: 1,
              build: 1,
            },
            pluginSetupRepo: multibodyPluginRepoAddr,
          },
          data: ethers.utils.defaultAbiCoder.encode(
            ['bytes', 'tuple(address[],address[],uint64,uint64,uint64,bool)[]'],
            [ethers.utils.id('metadata'), []]
          ),
        },
      ]
    ),
  };
}

export function multisigPrepareUpdate(
  pspAddr: string,
  daoAddr: string,
  multisigPluginRepoAddr: string,
  multisigAddr: string
) {
  return {
    to: pspAddr,
    value: 0,
    data: PluginSetupProcessor__factory.createInterface().encodeFunctionData(
      'prepareUpdate',
      [
        daoAddr,
        {
          currentVersionTag: {
            release: 1,
            build: 2,
          },
          newVersionTag: {
            release: 1,
            build: 3,
          },
          pluginSetupRepo: multisigPluginRepoAddr,
          setupPayload: {
            plugin: multisigAddr,
            currentHelpers: [],
            data: '0x',
          },
        },
      ]
    ),
  };
}

export function pspPermissions(
  daoAddr: string,
  pspAddr: string,
  multisigAddr: string
) {
  return [
    {
      to: daoAddr,
      value: 0,
      data: DAO__factory.createInterface().encodeFunctionData('grant', [
        multisigAddr,
        pspAddr,
        ethers.utils.id('UPGRADE_PLUGIN_PERMISSION'),
      ]),
    },
    // grant psp ROOT on dao so it can apply permissions
    {
      to: daoAddr,
      value: 0,
      data: DAO__factory.createInterface().encodeFunctionData('grant', [
        daoAddr,
        pspAddr,
        ethers.utils.id('ROOT_PERMISSION'),
      ]),
    },
  ];
}

export function multisigApplyUpdate(
  pspAddr: string,
  daoAddr: string,
  multisigAddr: string,
  multisigPluginRepoAddr: string,
  permissions: any
) {
  return {
    to: pspAddr,
    value: 0,
    data: PluginSetupProcessor__factory.createInterface().encodeFunctionData(
      'applyUpdate',
      [
        daoAddr,
        {
          plugin: multisigAddr,
          pluginSetupRef: {
            versionTag: {release: 1, build: 3},
            pluginSetupRepo: multisigPluginRepoAddr,
          },
          initData: '0x',
          permissions: permissions,
          helpersHash:
            '0x569e75fc77c1a856f6daaf9e69d8a9566ca34aa47f9133711ce065a571af0cfd',
        },
      ]
    ),
  };
}

export function multibodyApplyInstallation(
  pspAddr: string,
  daoAddr: string,
  multibodyPluginRepoAddr: string,
  multibodyAddr: string,
  permissions: any
) {
  return {
    to: pspAddr,
    value: 0,
    data: PluginSetupProcessor__factory.createInterface().encodeFunctionData(
      'applyInstallation',
      [
        daoAddr,
        {
          pluginSetupRef: {
            versionTag: {release: 1, build: 1},
            pluginSetupRepo: multibodyPluginRepoAddr,
          },
          plugin: multibodyAddr,
          permissions: permissions,
          helpersHash:
            '0x569e75fc77c1a856f6daaf9e69d8a9566ca34aa47f9133711ce065a571af0cfd',
        },
      ]
    ),
  };
}

export function encodePluginA_createProposalCall(
  multibody: string,
  proposalIdOnMultibody: string
) {
  return new ethers.utils.Interface(PluginA__factory.abi).encodeFunctionData(
    'createProposal',
    [
      ethers.utils.id('somedata'),
      [
        {
          to: multibody,
          value: 0,
          data: new ethers.utils.Interface(
            MultiBody__factory.abi
          ).encodeFunctionData('advanceProposal', [proposalIdOnMultibody]),
        },
      ],
      12,
      23,
    ]
  );
}

export function encodeMultisig_createProposalCall(
  multibody: string,
  proposalIdOnMultibody: string
) {
  return new ethers.utils.Interface(MultisigV2__factory.abi).encodeFunctionData(
    'createProposal',
    [
      ethers.utils.id('somedata'),
      [
        {
          to: multibody,
          value: 0,
          data: new ethers.utils.Interface(
            MultiBody__factory.abi
          ).encodeFunctionData('advanceProposal', [proposalIdOnMultibody]),
        },
      ],
      0,
      false, // TODO:GIORGI how can UI figure out that this value should be false ?
      false,
      0,
      Date.now() + 300000,
    ]
  );
}
