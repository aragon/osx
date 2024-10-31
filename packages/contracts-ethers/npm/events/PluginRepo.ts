export {
  GrantedEvent,
  RevokedEvent,
  UpgradedEvent,
  InitializedEvent,
  AdminChangedEvent,
  BeaconUpgradedEvent,
  VersionCreatedEvent,
  ReleaseMetadataUpdatedEvent,
} from '../../types/src/framework/plugin/repo/PluginRepo';

export type EventName =
  | 'Granted'
  | 'Revoked'
  | 'Upgraded'
  | 'Initialized'
  | 'AdminChanged'
  | 'BeaconUpgraded'
  | 'VersionCreated'
  | 'ReleaseMetadataUpdated';
