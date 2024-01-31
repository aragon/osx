export {
  UpgradedEvent,
  AdminChangedEvent,
  BeaconUpgradedEvent,
  DAORegisteredEvent,
  InitializedEvent,
} from '../../types/framework/dao/DAORegistry';

export type EventName =
  | 'Upgraded'
  | 'AdminChanged'
  | 'BeaconUpgraded'
  | 'DAORegistered'
  | 'Initialized';
