//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IMultisig
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iMultisigAbi = [
  {
    type: 'function',
    inputs: [{name: '_members', internalType: 'address[]', type: 'address[]'}],
    name: 'addAddresses',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {name: '_tryExecution', internalType: 'bool', type: 'bool'},
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {name: '_account', internalType: 'address', type: 'address'},
    ],
    name: 'canApprove',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'canExecute',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'execute',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {name: '_account', internalType: 'address', type: 'address'},
    ],
    name: 'hasApproved',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_members', internalType: 'address[]', type: 'address[]'}],
    name: 'removeAddresses',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Multisig
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const multisigAbi = [
  {
    type: 'error',
    inputs: [
      {name: 'limit', internalType: 'uint16', type: 'uint16'},
      {name: 'actual', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'AddresslistLengthOutOfBounds',
  },
  {
    type: 'error',
    inputs: [
      {name: 'proposalId', internalType: 'uint256', type: 'uint256'},
      {name: 'sender', internalType: 'address', type: 'address'},
    ],
    name: 'ApprovalCastForbidden',
  },
  {
    type: 'error',
    inputs: [
      {name: 'dao', internalType: 'address', type: 'address'},
      {name: 'where', internalType: 'address', type: 'address'},
      {name: 'who', internalType: 'address', type: 'address'},
      {name: 'permissionId', internalType: 'bytes32', type: 'bytes32'},
    ],
    name: 'DaoUnauthorized',
  },
  {
    type: 'error',
    inputs: [
      {name: 'limit', internalType: 'uint64', type: 'uint64'},
      {name: 'actual', internalType: 'uint64', type: 'uint64'},
    ],
    name: 'DateOutOfBounds',
  },
  {
    type: 'error',
    inputs: [{name: 'member', internalType: 'address', type: 'address'}],
    name: 'InvalidAddresslistUpdate',
  },
  {
    type: 'error',
    inputs: [
      {name: 'limit', internalType: 'uint16', type: 'uint16'},
      {name: 'actual', internalType: 'uint16', type: 'uint16'},
    ],
    name: 'MinApprovalsOutOfBounds',
  },
  {
    type: 'error',
    inputs: [{name: 'sender', internalType: 'address', type: 'address'}],
    name: 'ProposalCreationForbidden',
  },
  {
    type: 'error',
    inputs: [{name: 'proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'ProposalExecutionForbidden',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousAdmin',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'newAdmin',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AdminChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'approver',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Approved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'beacon', internalType: 'address', type: 'address', indexed: true},
    ],
    name: 'BeaconUpgraded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'version', internalType: 'uint8', type: 'uint8', indexed: false},
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'members',
        internalType: 'address[]',
        type: 'address[]',
        indexed: false,
      },
    ],
    name: 'MembersAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'members',
        internalType: 'address[]',
        type: 'address[]',
        indexed: false,
      },
    ],
    name: 'MembersRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'definingContract',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'MembershipContractAnnounced',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'onlyListed', internalType: 'bool', type: 'bool', indexed: false},
      {
        name: 'minApprovals',
        internalType: 'uint16',
        type: 'uint16',
        indexed: true,
      },
    ],
    name: 'MultisigSettingsUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'creator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'startDate',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {name: 'endDate', internalType: 'uint64', type: 'uint64', indexed: false},
      {name: 'metadata', internalType: 'bytes', type: 'bytes', indexed: false},
      {
        name: 'actions',
        internalType: 'struct IDAO.Action[]',
        type: 'tuple[]',
        components: [
          {name: 'to', internalType: 'address', type: 'address'},
          {name: 'value', internalType: 'uint256', type: 'uint256'},
          {name: 'data', internalType: 'bytes', type: 'bytes'},
        ],
        indexed: false,
      },
      {
        name: 'allowFailureMap',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ProposalCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'ProposalExecuted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'implementation',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Upgraded',
  },
  {
    type: 'function',
    inputs: [],
    name: 'UPDATE_MULTISIG_SETTINGS_PERMISSION_ID',
    outputs: [{name: '', internalType: 'bytes32', type: 'bytes32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'UPGRADE_PLUGIN_PERMISSION_ID',
    outputs: [{name: '', internalType: 'bytes32', type: 'bytes32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_members', internalType: 'address[]', type: 'address[]'}],
    name: 'addAddresses',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'addresslistLength',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_blockNumber', internalType: 'uint256', type: 'uint256'}],
    name: 'addresslistLengthAtBlock',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {name: '_tryExecution', internalType: 'bool', type: 'bool'},
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {name: '_account', internalType: 'address', type: 'address'},
    ],
    name: 'canApprove',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'canExecute',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_metadata', internalType: 'bytes', type: 'bytes'},
      {
        name: '_actions',
        internalType: 'struct IDAO.Action[]',
        type: 'tuple[]',
        components: [
          {name: 'to', internalType: 'address', type: 'address'},
          {name: 'value', internalType: 'uint256', type: 'uint256'},
          {name: 'data', internalType: 'bytes', type: 'bytes'},
        ],
      },
      {name: '_allowFailureMap', internalType: 'uint256', type: 'uint256'},
      {name: '_approveProposal', internalType: 'bool', type: 'bool'},
      {name: '_tryExecution', internalType: 'bool', type: 'bool'},
      {name: '_startDate', internalType: 'uint64', type: 'uint64'},
      {name: '_endDate', internalType: 'uint64', type: 'uint64'},
    ],
    name: 'createProposal',
    outputs: [{name: 'proposalId', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'dao',
    outputs: [{name: '', internalType: 'contract IDAO', type: 'address'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'execute',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'getProposal',
    outputs: [
      {name: 'executed', internalType: 'bool', type: 'bool'},
      {name: 'approvals', internalType: 'uint16', type: 'uint16'},
      {
        name: 'parameters',
        internalType: 'struct Multisig.ProposalParameters',
        type: 'tuple',
        components: [
          {name: 'minApprovals', internalType: 'uint16', type: 'uint16'},
          {name: 'snapshotBlock', internalType: 'uint64', type: 'uint64'},
          {name: 'startDate', internalType: 'uint64', type: 'uint64'},
          {name: 'endDate', internalType: 'uint64', type: 'uint64'},
        ],
      },
      {
        name: 'actions',
        internalType: 'struct IDAO.Action[]',
        type: 'tuple[]',
        components: [
          {name: 'to', internalType: 'address', type: 'address'},
          {name: 'value', internalType: 'uint256', type: 'uint256'},
          {name: 'data', internalType: 'bytes', type: 'bytes'},
        ],
      },
      {name: 'allowFailureMap', internalType: 'uint256', type: 'uint256'},
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {name: '_account', internalType: 'address', type: 'address'},
    ],
    name: 'hasApproved',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'implementation',
    outputs: [{name: '', internalType: 'address', type: 'address'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_dao', internalType: 'contract IDAO', type: 'address'},
      {name: '_members', internalType: 'address[]', type: 'address[]'},
      {
        name: '_multisigSettings',
        internalType: 'struct Multisig.MultisigSettings',
        type: 'tuple',
        components: [
          {name: 'onlyListed', internalType: 'bool', type: 'bool'},
          {name: 'minApprovals', internalType: 'uint16', type: 'uint16'},
        ],
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: '_account', internalType: 'address', type: 'address'}],
    name: 'isListed',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_account', internalType: 'address', type: 'address'},
      {name: '_blockNumber', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'isListedAtBlock',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_account', internalType: 'address', type: 'address'}],
    name: 'isMember',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'lastMultisigSettingsChange',
    outputs: [{name: '', internalType: 'uint64', type: 'uint64'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'multisigSettings',
    outputs: [
      {name: 'onlyListed', internalType: 'bool', type: 'bool'},
      {name: 'minApprovals', internalType: 'uint16', type: 'uint16'},
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pluginType',
    outputs: [
      {name: '', internalType: 'enum IPlugin.PluginType', type: 'uint8'},
    ],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [],
    name: 'proposalCount',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'protocolVersion',
    outputs: [{name: '', internalType: 'uint8[3]', type: 'uint8[3]'}],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [],
    name: 'proxiableUUID',
    outputs: [{name: '', internalType: 'bytes32', type: 'bytes32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_members', internalType: 'address[]', type: 'address[]'}],
    name: 'removeAddresses',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: '_interfaceId', internalType: 'bytes4', type: 'bytes4'}],
    name: 'supportsInterface',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_multisigSettings',
        internalType: 'struct Multisig.MultisigSettings',
        type: 'tuple',
        components: [
          {name: 'onlyListed', internalType: 'bool', type: 'bool'},
          {name: 'minApprovals', internalType: 'uint16', type: 'uint16'},
        ],
      },
    ],
    name: 'updateMultisigSettings',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'newImplementation', internalType: 'address', type: 'address'},
    ],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'newImplementation', internalType: 'address', type: 'address'},
      {name: 'data', internalType: 'bytes', type: 'bytes'},
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MultisigSetup
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const multisigSetupAbi = [
  {type: 'constructor', inputs: [], stateMutability: 'nonpayable'},
  {
    type: 'error',
    inputs: [
      {name: 'fromBuild', internalType: 'uint16', type: 'uint16'},
      {name: 'thisBuild', internalType: 'uint16', type: 'uint16'},
    ],
    name: 'InvalidUpdatePath',
  },
  {
    type: 'function',
    inputs: [],
    name: 'implementation',
    outputs: [{name: '', internalType: 'address', type: 'address'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_dao', internalType: 'address', type: 'address'},
      {name: '_data', internalType: 'bytes', type: 'bytes'},
    ],
    name: 'prepareInstallation',
    outputs: [
      {name: 'plugin', internalType: 'address', type: 'address'},
      {
        name: 'preparedSetupData',
        internalType: 'struct IPluginSetup.PreparedSetupData',
        type: 'tuple',
        components: [
          {name: 'helpers', internalType: 'address[]', type: 'address[]'},
          {
            name: 'permissions',
            internalType: 'struct PermissionLib.MultiTargetPermission[]',
            type: 'tuple[]',
            components: [
              {
                name: 'operation',
                internalType: 'enum PermissionLib.Operation',
                type: 'uint8',
              },
              {name: 'where', internalType: 'address', type: 'address'},
              {name: 'who', internalType: 'address', type: 'address'},
              {name: 'condition', internalType: 'address', type: 'address'},
              {name: 'permissionId', internalType: 'bytes32', type: 'bytes32'},
            ],
          },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: '_dao', internalType: 'address', type: 'address'},
      {
        name: '_payload',
        internalType: 'struct IPluginSetup.SetupPayload',
        type: 'tuple',
        components: [
          {name: 'plugin', internalType: 'address', type: 'address'},
          {
            name: 'currentHelpers',
            internalType: 'address[]',
            type: 'address[]',
          },
          {name: 'data', internalType: 'bytes', type: 'bytes'},
        ],
      },
    ],
    name: 'prepareUninstallation',
    outputs: [
      {
        name: 'permissions',
        internalType: 'struct PermissionLib.MultiTargetPermission[]',
        type: 'tuple[]',
        components: [
          {
            name: 'operation',
            internalType: 'enum PermissionLib.Operation',
            type: 'uint8',
          },
          {name: 'where', internalType: 'address', type: 'address'},
          {name: 'who', internalType: 'address', type: 'address'},
          {name: 'condition', internalType: 'address', type: 'address'},
          {name: 'permissionId', internalType: 'bytes32', type: 'bytes32'},
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_dao', internalType: 'address', type: 'address'},
      {name: '_fromBuild', internalType: 'uint16', type: 'uint16'},
      {
        name: '_payload',
        internalType: 'struct IPluginSetup.SetupPayload',
        type: 'tuple',
        components: [
          {name: 'plugin', internalType: 'address', type: 'address'},
          {
            name: 'currentHelpers',
            internalType: 'address[]',
            type: 'address[]',
          },
          {name: 'data', internalType: 'bytes', type: 'bytes'},
        ],
      },
    ],
    name: 'prepareUpdate',
    outputs: [
      {name: 'initData', internalType: 'bytes', type: 'bytes'},
      {
        name: 'preparedSetupData',
        internalType: 'struct IPluginSetup.PreparedSetupData',
        type: 'tuple',
        components: [
          {name: 'helpers', internalType: 'address[]', type: 'address[]'},
          {
            name: 'permissions',
            internalType: 'struct PermissionLib.MultiTargetPermission[]',
            type: 'tuple[]',
            components: [
              {
                name: 'operation',
                internalType: 'enum PermissionLib.Operation',
                type: 'uint8',
              },
              {name: 'where', internalType: 'address', type: 'address'},
              {name: 'who', internalType: 'address', type: 'address'},
              {name: 'condition', internalType: 'address', type: 'address'},
              {name: 'permissionId', internalType: 'bytes32', type: 'bytes32'},
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'protocolVersion',
    outputs: [{name: '', internalType: 'uint8[3]', type: 'uint8[3]'}],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [{name: '_interfaceId', internalType: 'bytes4', type: 'bytes4'}],
    name: 'supportsInterface',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
] as const
