export {
  UpdateAppliedEvent,
  UpdatePreparedEvent,
  InstallationAppliedEvent,
  InstallationPreparedEvent,
  UninstallationAppliedEvent,
  UninstallationPreparedEvent,
} from '../../types/src/framework/plugin/setup/PluginSetupProcessor';

export type EventName =
  | 'UpdateApplied'
  | 'UpdatePrepared'
  | 'InstallationApplied'
  | 'InstallationPrepared'
  | 'UninstallationApplied'
  | 'UninstallationPrepared';
