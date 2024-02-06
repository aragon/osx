export {
  UpgradedEvent,
  InitializedEvent,
  AdminChangedEvent,
  BeaconUpgradedEvent,
  PluginRepoRegisteredEvent,
} from '../../types/framework/plugin/repo/PluginRepoRegistry';

export type EventName =
  | 'Upgraded'
  | 'Initialized'
  | 'AdminChanged'
  | 'BeaconUpgraded'
  | 'PluginRepoRegistered';
