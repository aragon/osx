export {
  UpgradedEvent,
  AdminChangedEvent,
  BeaconUpgradedEvent,
  DAORegisteredEvent,
  InitializedEvent,
} from '../../types/src/framework/dao/DAORegistry';

export type EventName =
  | 'Upgraded'
  | 'AdminChanged'
  | 'BeaconUpgraded'
  | 'DAORegistered'
  | 'Initialized';
