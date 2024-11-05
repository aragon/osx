export {
  GrantedEvent,
  RevokedEvent,
  ExecutedEvent,
  UpgradedEvent,
  DepositedEvent,
  InitializedEvent,
  MetadataSetEvent,
  AdminChangedEvent,
  BeaconUpgradedEvent,
  CallbackReceivedEvent,
  TrustedForwarderSetEvent,
  NativeTokenDepositedEvent,
  StandardCallbackRegisteredEvent,
} from '../../types/src/core/dao/DAO';

export type EventName =
  | 'Granted'
  | 'Revoked'
  | 'Executed'
  | 'Upgraded'
  | 'Deposited'
  | 'Initialized'
  | 'MetadataSet'
  | 'AdminChanged'
  | 'BeaconUpgraded'
  | 'CallbackReceived'
  | 'TrustedForwarderSet'
  | 'NativeTokenDeposited'
  | 'SignatureValidatorSet'
  | 'StandardCallbackRegistered';
