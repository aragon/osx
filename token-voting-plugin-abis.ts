//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DAOMock
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const daoMockAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'sender', internalType: 'address', type: 'address', indexed: true},
      {name: 'token', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: '_reference',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'Deposited',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'actor', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'callId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
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
        indexed: false,
      },
      {
        name: 'allowFailureMap',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'failureMap',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'execResults',
        internalType: 'bytes[]',
        type: 'bytes[]',
        indexed: false,
      },
    ],
    name: 'Executed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'permissionId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {name: 'here', internalType: 'address', type: 'address', indexed: true},
      {name: 'where', internalType: 'address', type: 'address', indexed: false},
      {name: 'who', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'condition',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Granted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'metadata', internalType: 'bytes', type: 'bytes', indexed: false},
    ],
    name: 'MetadataSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'NativeTokenDeposited',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'permissionId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {name: 'here', internalType: 'address', type: 'address', indexed: true},
      {name: 'where', internalType: 'address', type: 'address', indexed: false},
      {name: 'who', internalType: 'address', type: 'address', indexed: true},
    ],
    name: 'Revoked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'interfaceId',
        internalType: 'bytes4',
        type: 'bytes4',
        indexed: false,
      },
      {
        name: 'callbackSelector',
        internalType: 'bytes4',
        type: 'bytes4',
        indexed: false,
      },
      {
        name: 'magicNumber',
        internalType: 'bytes4',
        type: 'bytes4',
        indexed: false,
      },
    ],
    name: 'StandardCallbackRegistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'forwarder',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'TrustedForwarderSet',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_items',
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
    name: 'applyMultiTargetPermissions',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: '_token', internalType: 'address', type: 'address'},
      {name: '_amount', internalType: 'uint256', type: 'uint256'},
      {name: '_reference', internalType: 'string', type: 'string'},
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'callId', internalType: 'bytes32', type: 'bytes32'},
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
      {name: 'allowFailureMap', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'execute',
    outputs: [
      {name: 'execResults', internalType: 'bytes[]', type: 'bytes[]'},
      {name: 'failureMap', internalType: 'uint256', type: 'uint256'},
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTrustedForwarder',
    outputs: [{name: '', internalType: 'address', type: 'address'}],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      {name: '_where', internalType: 'address', type: 'address'},
      {name: '_who', internalType: 'address', type: 'address'},
      {name: '_permissionId', internalType: 'bytes32', type: 'bytes32'},
    ],
    name: 'grant',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: '_where', internalType: 'address', type: 'address'},
      {name: '_who', internalType: 'address', type: 'address'},
      {name: '_permissionId', internalType: 'bytes32', type: 'bytes32'},
      {
        name: '_condition',
        internalType: 'contract IPermissionCondition',
        type: 'address',
      },
    ],
    name: 'grantWithCondition',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: '_where', internalType: 'address', type: 'address'},
      {name: '_who', internalType: 'address', type: 'address'},
      {name: '_permissionId', internalType: 'bytes32', type: 'bytes32'},
      {name: '_data', internalType: 'bytes', type: 'bytes'},
    ],
    name: 'hasPermission',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'hasPermissionReturnValueMock',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_hash', internalType: 'bytes32', type: 'bytes32'},
      {name: '_signature', internalType: 'bytes', type: 'bytes'},
    ],
    name: 'isValidSignature',
    outputs: [{name: '', internalType: 'bytes4', type: 'bytes4'}],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      {name: '_interfaceId', internalType: 'bytes4', type: 'bytes4'},
      {name: '_callbackSelector', internalType: 'bytes4', type: 'bytes4'},
      {name: '_magicNumber', internalType: 'bytes4', type: 'bytes4'},
    ],
    name: 'registerStandardCallback',
    outputs: [],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      {name: '_where', internalType: 'address', type: 'address'},
      {name: '_who', internalType: 'address', type: 'address'},
      {name: '_permissionId', internalType: 'bytes32', type: 'bytes32'},
    ],
    name: 'revoke',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_hasPermissionReturnValueMock',
        internalType: 'bool',
        type: 'bool',
      },
    ],
    name: 'setHasPermissionReturnValueMock',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: '_metadata', internalType: 'bytes', type: 'bytes'}],
    name: 'setMetadata',
    outputs: [],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      {name: '_signatureValidator', internalType: 'address', type: 'address'},
    ],
    name: 'setSignatureValidator',
    outputs: [],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      {name: '_trustedForwarder', internalType: 'address', type: 'address'},
    ],
    name: 'setTrustedForwarder',
    outputs: [],
    stateMutability: 'pure',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ERC20Mock
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const erc20MockAbi = [
  {
    type: 'constructor',
    inputs: [
      {name: '_name', internalType: 'string', type: 'string'},
      {name: '_symbol', internalType: 'string', type: 'string'},
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {name: 'value', internalType: 'uint256', type: 'uint256', indexed: false},
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'from', internalType: 'address', type: 'address', indexed: true},
      {name: 'to', internalType: 'address', type: 'address', indexed: true},
      {name: 'value', internalType: 'uint256', type: 'uint256', indexed: false},
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address'},
      {name: 'spender', internalType: 'address', type: 'address'},
    ],
    name: 'allowance',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'approve',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'balanceOf',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{name: '', internalType: 'uint8', type: 'uint8'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals_',
    outputs: [{name: '', internalType: 'uint8', type: 'uint8'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'subtractedValue', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'decreaseAllowance',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'addedValue', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'increaseAllowance',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'setBalance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: '_decimals', internalType: 'uint8', type: 'uint8'}],
    name: 'setDecimals',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'transfer',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'from', internalType: 'address', type: 'address'},
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'transferFrom',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GovernanceERC20
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const governanceErc20Abi = [
  {
    type: 'constructor',
    inputs: [
      {name: '_dao', internalType: 'contract IDAO', type: 'address'},
      {name: '_name', internalType: 'string', type: 'string'},
      {name: '_symbol', internalType: 'string', type: 'string'},
      {
        name: '_mintSettings',
        internalType: 'struct GovernanceERC20.MintSettings',
        type: 'tuple',
        components: [
          {name: 'receivers', internalType: 'address[]', type: 'address[]'},
          {name: 'amounts', internalType: 'uint256[]', type: 'uint256[]'},
        ],
      },
    ],
    stateMutability: 'nonpayable',
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
      {name: 'receiversArrayLength', internalType: 'uint256', type: 'uint256'},
      {name: 'amountsArrayLength', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'MintSettingsArrayLengthMismatch',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {name: 'value', internalType: 'uint256', type: 'uint256', indexed: false},
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'delegator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'fromDelegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'toDelegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'DelegateChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'delegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'previousBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DelegateVotesChanged',
  },
  {type: 'event', anonymous: false, inputs: [], name: 'EIP712DomainChanged'},
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
      {name: 'from', internalType: 'address', type: 'address', indexed: true},
      {name: 'to', internalType: 'address', type: 'address', indexed: true},
      {name: 'value', internalType: 'uint256', type: 'uint256', indexed: false},
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CLOCK_MODE',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{name: '', internalType: 'bytes32', type: 'bytes32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MINT_PERMISSION_ID',
    outputs: [{name: '', internalType: 'bytes32', type: 'bytes32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address'},
      {name: 'spender', internalType: 'address', type: 'address'},
    ],
    name: 'allowance',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'approve',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'balanceOf',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'account', internalType: 'address', type: 'address'},
      {name: 'pos', internalType: 'uint32', type: 'uint32'},
    ],
    name: 'checkpoints',
    outputs: [
      {
        name: '',
        internalType: 'struct ERC20VotesUpgradeable.Checkpoint',
        type: 'tuple',
        components: [
          {name: 'fromBlock', internalType: 'uint32', type: 'uint32'},
          {name: 'votes', internalType: 'uint224', type: 'uint224'},
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'clock',
    outputs: [{name: '', internalType: 'uint48', type: 'uint48'}],
    stateMutability: 'view',
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
    inputs: [],
    name: 'decimals',
    outputs: [{name: '', internalType: 'uint8', type: 'uint8'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'subtractedValue', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'decreaseAllowance',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: 'delegatee', internalType: 'address', type: 'address'}],
    name: 'delegate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'delegatee', internalType: 'address', type: 'address'},
      {name: 'nonce', internalType: 'uint256', type: 'uint256'},
      {name: 'expiry', internalType: 'uint256', type: 'uint256'},
      {name: 'v', internalType: 'uint8', type: 'uint8'},
      {name: 'r', internalType: 'bytes32', type: 'bytes32'},
      {name: 's', internalType: 'bytes32', type: 'bytes32'},
    ],
    name: 'delegateBySig',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'delegates',
    outputs: [{name: '', internalType: 'address', type: 'address'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      {name: 'fields', internalType: 'bytes1', type: 'bytes1'},
      {name: 'name', internalType: 'string', type: 'string'},
      {name: 'version', internalType: 'string', type: 'string'},
      {name: 'chainId', internalType: 'uint256', type: 'uint256'},
      {name: 'verifyingContract', internalType: 'address', type: 'address'},
      {name: 'salt', internalType: 'bytes32', type: 'bytes32'},
      {name: 'extensions', internalType: 'uint256[]', type: 'uint256[]'},
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'timepoint', internalType: 'uint256', type: 'uint256'}],
    name: 'getPastTotalSupply',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'account', internalType: 'address', type: 'address'},
      {name: 'timepoint', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'getPastVotes',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'getVotes',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'addedValue', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'increaseAllowance',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: '_dao', internalType: 'contract IDAO', type: 'address'},
      {name: '_name', internalType: 'string', type: 'string'},
      {name: '_symbol', internalType: 'string', type: 'string'},
      {
        name: '_mintSettings',
        internalType: 'struct GovernanceERC20.MintSettings',
        type: 'tuple',
        components: [
          {name: 'receivers', internalType: 'address[]', type: 'address[]'},
          {name: 'amounts', internalType: 'uint256[]', type: 'uint256[]'},
        ],
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'owner', internalType: 'address', type: 'address'}],
    name: 'nonces',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'numCheckpoints',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address'},
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'value', internalType: 'uint256', type: 'uint256'},
      {name: 'deadline', internalType: 'uint256', type: 'uint256'},
      {name: 'v', internalType: 'uint8', type: 'uint8'},
      {name: 'r', internalType: 'bytes32', type: 'bytes32'},
      {name: 's', internalType: 'bytes32', type: 'bytes32'},
    ],
    name: 'permit',
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
    inputs: [],
    name: 'symbol',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'transfer',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'from', internalType: 'address', type: 'address'},
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'transferFrom',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GovernanceWrappedERC20
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const governanceWrappedErc20Abi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_token',
        internalType: 'contract IERC20Upgradeable',
        type: 'address',
      },
      {name: '_name', internalType: 'string', type: 'string'},
      {name: '_symbol', internalType: 'string', type: 'string'},
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {name: 'value', internalType: 'uint256', type: 'uint256', indexed: false},
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'delegator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'fromDelegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'toDelegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'DelegateChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'delegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'previousBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DelegateVotesChanged',
  },
  {type: 'event', anonymous: false, inputs: [], name: 'EIP712DomainChanged'},
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
      {name: 'from', internalType: 'address', type: 'address', indexed: true},
      {name: 'to', internalType: 'address', type: 'address', indexed: true},
      {name: 'value', internalType: 'uint256', type: 'uint256', indexed: false},
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CLOCK_MODE',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{name: '', internalType: 'bytes32', type: 'bytes32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address'},
      {name: 'spender', internalType: 'address', type: 'address'},
    ],
    name: 'allowance',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'approve',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'balanceOf',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'account', internalType: 'address', type: 'address'},
      {name: 'pos', internalType: 'uint32', type: 'uint32'},
    ],
    name: 'checkpoints',
    outputs: [
      {
        name: '',
        internalType: 'struct ERC20VotesUpgradeable.Checkpoint',
        type: 'tuple',
        components: [
          {name: 'fromBlock', internalType: 'uint32', type: 'uint32'},
          {name: 'votes', internalType: 'uint224', type: 'uint224'},
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'clock',
    outputs: [{name: '', internalType: 'uint48', type: 'uint48'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{name: '', internalType: 'uint8', type: 'uint8'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'subtractedValue', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'decreaseAllowance',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: 'delegatee', internalType: 'address', type: 'address'}],
    name: 'delegate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'delegatee', internalType: 'address', type: 'address'},
      {name: 'nonce', internalType: 'uint256', type: 'uint256'},
      {name: 'expiry', internalType: 'uint256', type: 'uint256'},
      {name: 'v', internalType: 'uint8', type: 'uint8'},
      {name: 'r', internalType: 'bytes32', type: 'bytes32'},
      {name: 's', internalType: 'bytes32', type: 'bytes32'},
    ],
    name: 'delegateBySig',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'delegates',
    outputs: [{name: '', internalType: 'address', type: 'address'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'account', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'depositFor',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      {name: 'fields', internalType: 'bytes1', type: 'bytes1'},
      {name: 'name', internalType: 'string', type: 'string'},
      {name: 'version', internalType: 'string', type: 'string'},
      {name: 'chainId', internalType: 'uint256', type: 'uint256'},
      {name: 'verifyingContract', internalType: 'address', type: 'address'},
      {name: 'salt', internalType: 'bytes32', type: 'bytes32'},
      {name: 'extensions', internalType: 'uint256[]', type: 'uint256[]'},
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'timepoint', internalType: 'uint256', type: 'uint256'}],
    name: 'getPastTotalSupply',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'account', internalType: 'address', type: 'address'},
      {name: 'timepoint', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'getPastVotes',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'getVotes',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'addedValue', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'increaseAllowance',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_token',
        internalType: 'contract IERC20Upgradeable',
        type: 'address',
      },
      {name: '_name', internalType: 'string', type: 'string'},
      {name: '_symbol', internalType: 'string', type: 'string'},
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'owner', internalType: 'address', type: 'address'}],
    name: 'nonces',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'numCheckpoints',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address'},
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'value', internalType: 'uint256', type: 'uint256'},
      {name: 'deadline', internalType: 'uint256', type: 'uint256'},
      {name: 'v', internalType: 'uint8', type: 'uint8'},
      {name: 'r', internalType: 'bytes32', type: 'bytes32'},
      {name: 's', internalType: 'bytes32', type: 'bytes32'},
    ],
    name: 'permit',
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
    inputs: [],
    name: 'symbol',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'transfer',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'from', internalType: 'address', type: 'address'},
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'transferFrom',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'underlying',
    outputs: [
      {name: '', internalType: 'contract IERC20Upgradeable', type: 'address'},
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'account', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'withdrawTo',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IERC20MintableUpgradeable
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const ierc20MintableUpgradeableAbi = [
  {
    type: 'function',
    inputs: [
      {name: '_to', internalType: 'address', type: 'address'},
      {name: '_amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IGovernanceWrappedERC20
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iGovernanceWrappedErc20Abi = [
  {
    type: 'function',
    inputs: [
      {name: 'account', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'depositFor',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'account', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'withdrawTo',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IMajorityVoting
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iMajorityVotingAbi = [
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
      {name: 'voter', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'votingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VoteCast',
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
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {name: '_account', internalType: 'address', type: 'address'},
      {
        name: '_voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
    name: 'canVote',
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
    name: 'getVoteOption',
    outputs: [
      {
        name: '',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isMinParticipationReached',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isSupportThresholdReached',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isSupportThresholdReachedEarly',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minParticipation',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'supportThreshold',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {
        name: '_voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
      {name: '_tryEarlyExecution', internalType: 'bool', type: 'bool'},
    ],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MajorityVotingBase
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const majorityVotingBaseAbi = [
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
    inputs: [
      {name: 'limit', internalType: 'uint64', type: 'uint64'},
      {name: 'actual', internalType: 'uint64', type: 'uint64'},
    ],
    name: 'MinDurationOutOfBounds',
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
    type: 'error',
    inputs: [
      {name: 'limit', internalType: 'uint256', type: 'uint256'},
      {name: 'actual', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'RatioOutOfBounds',
  },
  {
    type: 'error',
    inputs: [
      {name: 'proposalId', internalType: 'uint256', type: 'uint256'},
      {name: 'account', internalType: 'address', type: 'address'},
      {
        name: 'voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
    name: 'VoteCastForbidden',
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
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {name: 'voter', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'votingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VoteCast',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'votingMode',
        internalType: 'enum MajorityVotingBase.VotingMode',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'supportThreshold',
        internalType: 'uint32',
        type: 'uint32',
        indexed: false,
      },
      {
        name: 'minParticipation',
        internalType: 'uint32',
        type: 'uint32',
        indexed: false,
      },
      {
        name: 'minDuration',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {
        name: 'minProposerVotingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VotingSettingsUpdated',
  },
  {
    type: 'function',
    inputs: [],
    name: 'UPDATE_VOTING_SETTINGS_PERMISSION_ID',
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
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'canExecute',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {name: '_voter', internalType: 'address', type: 'address'},
      {
        name: '_voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
    name: 'canVote',
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
      {name: '_startDate', internalType: 'uint64', type: 'uint64'},
      {name: '_endDate', internalType: 'uint64', type: 'uint64'},
      {
        name: '_voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
      {name: '_tryEarlyExecution', internalType: 'bool', type: 'bool'},
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
      {name: 'open', internalType: 'bool', type: 'bool'},
      {name: 'executed', internalType: 'bool', type: 'bool'},
      {
        name: 'parameters',
        internalType: 'struct MajorityVotingBase.ProposalParameters',
        type: 'tuple',
        components: [
          {
            name: 'votingMode',
            internalType: 'enum MajorityVotingBase.VotingMode',
            type: 'uint8',
          },
          {name: 'supportThreshold', internalType: 'uint32', type: 'uint32'},
          {name: 'startDate', internalType: 'uint64', type: 'uint64'},
          {name: 'endDate', internalType: 'uint64', type: 'uint64'},
          {name: 'snapshotBlock', internalType: 'uint64', type: 'uint64'},
          {name: 'minVotingPower', internalType: 'uint256', type: 'uint256'},
        ],
      },
      {
        name: 'tally',
        internalType: 'struct MajorityVotingBase.Tally',
        type: 'tuple',
        components: [
          {name: 'abstain', internalType: 'uint256', type: 'uint256'},
          {name: 'yes', internalType: 'uint256', type: 'uint256'},
          {name: 'no', internalType: 'uint256', type: 'uint256'},
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
      {name: '_voter', internalType: 'address', type: 'address'},
    ],
    name: 'getVoteOption',
    outputs: [
      {
        name: '',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
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
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isMinParticipationReached',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isSupportThresholdReached',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isSupportThresholdReachedEarly',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minDuration',
    outputs: [{name: '', internalType: 'uint64', type: 'uint64'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minParticipation',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minProposerVotingPower',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
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
    inputs: [],
    name: 'supportThreshold',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
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
    inputs: [{name: '_blockNumber', internalType: 'uint256', type: 'uint256'}],
    name: 'totalVotingPower',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_votingSettings',
        internalType: 'struct MajorityVotingBase.VotingSettings',
        type: 'tuple',
        components: [
          {
            name: 'votingMode',
            internalType: 'enum MajorityVotingBase.VotingMode',
            type: 'uint8',
          },
          {name: 'supportThreshold', internalType: 'uint32', type: 'uint32'},
          {name: 'minParticipation', internalType: 'uint32', type: 'uint32'},
          {name: 'minDuration', internalType: 'uint64', type: 'uint64'},
          {
            name: 'minProposerVotingPower',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    name: 'updateVotingSettings',
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
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {
        name: '_voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
      {name: '_tryEarlyExecution', internalType: 'bool', type: 'bool'},
    ],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'votingMode',
    outputs: [
      {
        name: '',
        internalType: 'enum MajorityVotingBase.VotingMode',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MajorityVotingMock
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const majorityVotingMockAbi = [
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
    inputs: [
      {name: 'limit', internalType: 'uint64', type: 'uint64'},
      {name: 'actual', internalType: 'uint64', type: 'uint64'},
    ],
    name: 'MinDurationOutOfBounds',
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
    type: 'error',
    inputs: [
      {name: 'limit', internalType: 'uint256', type: 'uint256'},
      {name: 'actual', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'RatioOutOfBounds',
  },
  {
    type: 'error',
    inputs: [
      {name: 'proposalId', internalType: 'uint256', type: 'uint256'},
      {name: 'account', internalType: 'address', type: 'address'},
      {
        name: 'voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
    name: 'VoteCastForbidden',
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
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {name: 'voter', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'votingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VoteCast',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'votingMode',
        internalType: 'enum MajorityVotingBase.VotingMode',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'supportThreshold',
        internalType: 'uint32',
        type: 'uint32',
        indexed: false,
      },
      {
        name: 'minParticipation',
        internalType: 'uint32',
        type: 'uint32',
        indexed: false,
      },
      {
        name: 'minDuration',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {
        name: 'minProposerVotingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VotingSettingsUpdated',
  },
  {
    type: 'function',
    inputs: [],
    name: 'UPDATE_VOTING_SETTINGS_PERMISSION_ID',
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
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'canExecute',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {name: '_voter', internalType: 'address', type: 'address'},
      {
        name: '_voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
    name: 'canVote',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '', internalType: 'bytes', type: 'bytes'},
      {
        name: '',
        internalType: 'struct IDAO.Action[]',
        type: 'tuple[]',
        components: [
          {name: 'to', internalType: 'address', type: 'address'},
          {name: 'value', internalType: 'uint256', type: 'uint256'},
          {name: 'data', internalType: 'bytes', type: 'bytes'},
        ],
      },
      {name: '', internalType: 'uint256', type: 'uint256'},
      {name: '', internalType: 'uint64', type: 'uint64'},
      {name: '', internalType: 'uint64', type: 'uint64'},
      {
        name: '',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
      {name: '', internalType: 'bool', type: 'bool'},
    ],
    name: 'createProposal',
    outputs: [{name: 'proposalId', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'pure',
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
      {name: 'open', internalType: 'bool', type: 'bool'},
      {name: 'executed', internalType: 'bool', type: 'bool'},
      {
        name: 'parameters',
        internalType: 'struct MajorityVotingBase.ProposalParameters',
        type: 'tuple',
        components: [
          {
            name: 'votingMode',
            internalType: 'enum MajorityVotingBase.VotingMode',
            type: 'uint8',
          },
          {name: 'supportThreshold', internalType: 'uint32', type: 'uint32'},
          {name: 'startDate', internalType: 'uint64', type: 'uint64'},
          {name: 'endDate', internalType: 'uint64', type: 'uint64'},
          {name: 'snapshotBlock', internalType: 'uint64', type: 'uint64'},
          {name: 'minVotingPower', internalType: 'uint256', type: 'uint256'},
        ],
      },
      {
        name: 'tally',
        internalType: 'struct MajorityVotingBase.Tally',
        type: 'tuple',
        components: [
          {name: 'abstain', internalType: 'uint256', type: 'uint256'},
          {name: 'yes', internalType: 'uint256', type: 'uint256'},
          {name: 'no', internalType: 'uint256', type: 'uint256'},
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
      {name: '_voter', internalType: 'address', type: 'address'},
    ],
    name: 'getVoteOption',
    outputs: [
      {
        name: '',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
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
      {
        name: '_votingSettings',
        internalType: 'struct MajorityVotingBase.VotingSettings',
        type: 'tuple',
        components: [
          {
            name: 'votingMode',
            internalType: 'enum MajorityVotingBase.VotingMode',
            type: 'uint8',
          },
          {name: 'supportThreshold', internalType: 'uint32', type: 'uint32'},
          {name: 'minParticipation', internalType: 'uint32', type: 'uint32'},
          {name: 'minDuration', internalType: 'uint64', type: 'uint64'},
          {
            name: 'minProposerVotingPower',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    name: 'initializeMock',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isMinParticipationReached',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isSupportThresholdReached',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isSupportThresholdReachedEarly',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minDuration',
    outputs: [{name: '', internalType: 'uint64', type: 'uint64'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minParticipation',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minProposerVotingPower',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
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
    inputs: [],
    name: 'supportThreshold',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
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
    inputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    name: 'totalVotingPower',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_votingSettings',
        internalType: 'struct MajorityVotingBase.VotingSettings',
        type: 'tuple',
        components: [
          {
            name: 'votingMode',
            internalType: 'enum MajorityVotingBase.VotingMode',
            type: 'uint8',
          },
          {name: 'supportThreshold', internalType: 'uint32', type: 'uint32'},
          {name: 'minParticipation', internalType: 'uint32', type: 'uint32'},
          {name: 'minDuration', internalType: 'uint64', type: 'uint64'},
          {
            name: 'minProposerVotingPower',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    name: 'updateVotingSettings',
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
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {
        name: '_voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
      {name: '_tryEarlyExecution', internalType: 'bool', type: 'bool'},
    ],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'votingMode',
    outputs: [
      {
        name: '',
        internalType: 'enum MajorityVotingBase.VotingMode',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TestGovernanceERC20
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const testGovernanceErc20Abi = [
  {
    type: 'constructor',
    inputs: [
      {name: '_dao', internalType: 'contract IDAO', type: 'address'},
      {name: '_name', internalType: 'string', type: 'string'},
      {name: '_symbol', internalType: 'string', type: 'string'},
      {
        name: '_mintSettings',
        internalType: 'struct GovernanceERC20.MintSettings',
        type: 'tuple',
        components: [
          {name: 'receivers', internalType: 'address[]', type: 'address[]'},
          {name: 'amounts', internalType: 'uint256[]', type: 'uint256[]'},
        ],
      },
    ],
    stateMutability: 'nonpayable',
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
      {name: 'receiversArrayLength', internalType: 'uint256', type: 'uint256'},
      {name: 'amountsArrayLength', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'MintSettingsArrayLengthMismatch',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {name: 'value', internalType: 'uint256', type: 'uint256', indexed: false},
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'delegator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'fromDelegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'toDelegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'DelegateChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'delegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'previousBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DelegateVotesChanged',
  },
  {type: 'event', anonymous: false, inputs: [], name: 'EIP712DomainChanged'},
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
      {name: 'from', internalType: 'address', type: 'address', indexed: true},
      {name: 'to', internalType: 'address', type: 'address', indexed: true},
      {name: 'value', internalType: 'uint256', type: 'uint256', indexed: false},
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CLOCK_MODE',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{name: '', internalType: 'bytes32', type: 'bytes32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MINT_PERMISSION_ID',
    outputs: [{name: '', internalType: 'bytes32', type: 'bytes32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address'},
      {name: 'spender', internalType: 'address', type: 'address'},
    ],
    name: 'allowance',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'approve',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'balanceOf',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'account', internalType: 'address', type: 'address'},
      {name: 'pos', internalType: 'uint32', type: 'uint32'},
    ],
    name: 'checkpoints',
    outputs: [
      {
        name: '',
        internalType: 'struct ERC20VotesUpgradeable.Checkpoint',
        type: 'tuple',
        components: [
          {name: 'fromBlock', internalType: 'uint32', type: 'uint32'},
          {name: 'votes', internalType: 'uint224', type: 'uint224'},
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'clock',
    outputs: [{name: '', internalType: 'uint48', type: 'uint48'}],
    stateMutability: 'view',
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
    inputs: [],
    name: 'decimals',
    outputs: [{name: '', internalType: 'uint8', type: 'uint8'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'subtractedValue', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'decreaseAllowance',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: 'delegatee', internalType: 'address', type: 'address'}],
    name: 'delegate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'delegatee', internalType: 'address', type: 'address'},
      {name: 'nonce', internalType: 'uint256', type: 'uint256'},
      {name: 'expiry', internalType: 'uint256', type: 'uint256'},
      {name: 'v', internalType: 'uint8', type: 'uint8'},
      {name: 'r', internalType: 'bytes32', type: 'bytes32'},
      {name: 's', internalType: 'bytes32', type: 'bytes32'},
    ],
    name: 'delegateBySig',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'delegates',
    outputs: [{name: '', internalType: 'address', type: 'address'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      {name: 'fields', internalType: 'bytes1', type: 'bytes1'},
      {name: 'name', internalType: 'string', type: 'string'},
      {name: 'version', internalType: 'string', type: 'string'},
      {name: 'chainId', internalType: 'uint256', type: 'uint256'},
      {name: 'verifyingContract', internalType: 'address', type: 'address'},
      {name: 'salt', internalType: 'bytes32', type: 'bytes32'},
      {name: 'extensions', internalType: 'uint256[]', type: 'uint256[]'},
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'timepoint', internalType: 'uint256', type: 'uint256'}],
    name: 'getPastTotalSupply',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'account', internalType: 'address', type: 'address'},
      {name: 'timepoint', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'getPastVotes',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'getVotes',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'addedValue', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'increaseAllowance',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: '_dao', internalType: 'contract IDAO', type: 'address'},
      {name: '_name', internalType: 'string', type: 'string'},
      {name: '_symbol', internalType: 'string', type: 'string'},
      {
        name: '_mintSettings',
        internalType: 'struct GovernanceERC20.MintSettings',
        type: 'tuple',
        components: [
          {name: 'receivers', internalType: 'address[]', type: 'address[]'},
          {name: 'amounts', internalType: 'uint256[]', type: 'uint256[]'},
        ],
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'owner', internalType: 'address', type: 'address'}],
    name: 'nonces',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: 'account', internalType: 'address', type: 'address'}],
    name: 'numCheckpoints',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'owner', internalType: 'address', type: 'address'},
      {name: 'spender', internalType: 'address', type: 'address'},
      {name: 'value', internalType: 'uint256', type: 'uint256'},
      {name: 'deadline', internalType: 'uint256', type: 'uint256'},
      {name: 'v', internalType: 'uint8', type: 'uint8'},
      {name: 'r', internalType: 'bytes32', type: 'bytes32'},
      {name: 's', internalType: 'bytes32', type: 'bytes32'},
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'setBalance',
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
    inputs: [],
    name: 'symbol',
    outputs: [{name: '', internalType: 'string', type: 'string'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'transfer',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {name: 'from', internalType: 'address', type: 'address'},
      {name: 'to', internalType: 'address', type: 'address'},
      {name: 'amount', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'transferFrom',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TokenVoting
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const tokenVotingAbi = [
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
    inputs: [
      {name: 'limit', internalType: 'uint64', type: 'uint64'},
      {name: 'actual', internalType: 'uint64', type: 'uint64'},
    ],
    name: 'MinDurationOutOfBounds',
  },
  {type: 'error', inputs: [], name: 'NoVotingPower'},
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
    type: 'error',
    inputs: [
      {name: 'limit', internalType: 'uint256', type: 'uint256'},
      {name: 'actual', internalType: 'uint256', type: 'uint256'},
    ],
    name: 'RatioOutOfBounds',
  },
  {
    type: 'error',
    inputs: [
      {name: 'proposalId', internalType: 'uint256', type: 'uint256'},
      {name: 'account', internalType: 'address', type: 'address'},
      {
        name: 'voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
    name: 'VoteCastForbidden',
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
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {name: 'voter', internalType: 'address', type: 'address', indexed: true},
      {
        name: 'voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'votingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VoteCast',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'votingMode',
        internalType: 'enum MajorityVotingBase.VotingMode',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'supportThreshold',
        internalType: 'uint32',
        type: 'uint32',
        indexed: false,
      },
      {
        name: 'minParticipation',
        internalType: 'uint32',
        type: 'uint32',
        indexed: false,
      },
      {
        name: 'minDuration',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {
        name: 'minProposerVotingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VotingSettingsUpdated',
  },
  {
    type: 'function',
    inputs: [],
    name: 'UPDATE_VOTING_SETTINGS_PERMISSION_ID',
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
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'canExecute',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {name: '_voter', internalType: 'address', type: 'address'},
      {
        name: '_voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
    name: 'canVote',
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
      {name: '_startDate', internalType: 'uint64', type: 'uint64'},
      {name: '_endDate', internalType: 'uint64', type: 'uint64'},
      {
        name: '_voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
      {name: '_tryEarlyExecution', internalType: 'bool', type: 'bool'},
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
      {name: 'open', internalType: 'bool', type: 'bool'},
      {name: 'executed', internalType: 'bool', type: 'bool'},
      {
        name: 'parameters',
        internalType: 'struct MajorityVotingBase.ProposalParameters',
        type: 'tuple',
        components: [
          {
            name: 'votingMode',
            internalType: 'enum MajorityVotingBase.VotingMode',
            type: 'uint8',
          },
          {name: 'supportThreshold', internalType: 'uint32', type: 'uint32'},
          {name: 'startDate', internalType: 'uint64', type: 'uint64'},
          {name: 'endDate', internalType: 'uint64', type: 'uint64'},
          {name: 'snapshotBlock', internalType: 'uint64', type: 'uint64'},
          {name: 'minVotingPower', internalType: 'uint256', type: 'uint256'},
        ],
      },
      {
        name: 'tally',
        internalType: 'struct MajorityVotingBase.Tally',
        type: 'tuple',
        components: [
          {name: 'abstain', internalType: 'uint256', type: 'uint256'},
          {name: 'yes', internalType: 'uint256', type: 'uint256'},
          {name: 'no', internalType: 'uint256', type: 'uint256'},
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
      {name: '_voter', internalType: 'address', type: 'address'},
    ],
    name: 'getVoteOption',
    outputs: [
      {
        name: '',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getVotingToken',
    outputs: [
      {name: '', internalType: 'contract IVotesUpgradeable', type: 'address'},
    ],
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
      {
        name: '_votingSettings',
        internalType: 'struct MajorityVotingBase.VotingSettings',
        type: 'tuple',
        components: [
          {
            name: 'votingMode',
            internalType: 'enum MajorityVotingBase.VotingMode',
            type: 'uint8',
          },
          {name: 'supportThreshold', internalType: 'uint32', type: 'uint32'},
          {name: 'minParticipation', internalType: 'uint32', type: 'uint32'},
          {name: 'minDuration', internalType: 'uint64', type: 'uint64'},
          {
            name: 'minProposerVotingPower',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
      {
        name: '_token',
        internalType: 'contract IVotesUpgradeable',
        type: 'address',
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
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
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isMinParticipationReached',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isSupportThresholdReached',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{name: '_proposalId', internalType: 'uint256', type: 'uint256'}],
    name: 'isSupportThresholdReachedEarly',
    outputs: [{name: '', internalType: 'bool', type: 'bool'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minDuration',
    outputs: [{name: '', internalType: 'uint64', type: 'uint64'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minParticipation',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minProposerVotingPower',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
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
    inputs: [],
    name: 'supportThreshold',
    outputs: [{name: '', internalType: 'uint32', type: 'uint32'}],
    stateMutability: 'view',
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
    inputs: [{name: '_blockNumber', internalType: 'uint256', type: 'uint256'}],
    name: 'totalVotingPower',
    outputs: [{name: '', internalType: 'uint256', type: 'uint256'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_votingSettings',
        internalType: 'struct MajorityVotingBase.VotingSettings',
        type: 'tuple',
        components: [
          {
            name: 'votingMode',
            internalType: 'enum MajorityVotingBase.VotingMode',
            type: 'uint8',
          },
          {name: 'supportThreshold', internalType: 'uint32', type: 'uint32'},
          {name: 'minParticipation', internalType: 'uint32', type: 'uint32'},
          {name: 'minDuration', internalType: 'uint64', type: 'uint64'},
          {
            name: 'minProposerVotingPower',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    name: 'updateVotingSettings',
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
  {
    type: 'function',
    inputs: [
      {name: '_proposalId', internalType: 'uint256', type: 'uint256'},
      {
        name: '_voteOption',
        internalType: 'enum IMajorityVoting.VoteOption',
        type: 'uint8',
      },
      {name: '_tryEarlyExecution', internalType: 'bool', type: 'bool'},
    ],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'votingMode',
    outputs: [
      {
        name: '',
        internalType: 'enum MajorityVotingBase.VotingMode',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TokenVotingSetup
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const tokenVotingSetupAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_governanceERC20Base',
        internalType: 'contract GovernanceERC20',
        type: 'address',
      },
      {
        name: '_governanceWrappedERC20Base',
        internalType: 'contract GovernanceWrappedERC20',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    inputs: [
      {name: 'fromBuild', internalType: 'uint16', type: 'uint16'},
      {name: 'thisBuild', internalType: 'uint16', type: 'uint16'},
    ],
    name: 'InvalidUpdatePath',
  },
  {
    type: 'error',
    inputs: [{name: 'token', internalType: 'address', type: 'address'}],
    name: 'TokenNotContract',
  },
  {
    type: 'error',
    inputs: [{name: 'token', internalType: 'address', type: 'address'}],
    name: 'TokenNotERC20',
  },
  {
    type: 'error',
    inputs: [{name: 'length', internalType: 'uint256', type: 'uint256'}],
    name: 'WrongHelpersArrayLength',
  },
  {
    type: 'function',
    inputs: [],
    name: 'EXECUTE_PERMISSION_ID',
    outputs: [{name: '', internalType: 'bytes32', type: 'bytes32'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'governanceERC20Base',
    outputs: [{name: '', internalType: 'address', type: 'address'}],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'governanceWrappedERC20Base',
    outputs: [{name: '', internalType: 'address', type: 'address'}],
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
