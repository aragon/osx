export {
  UpdateAppliedEvent,
  UpdatePreparedEvent,
  InstallationAppliedEvent,
  InstallationPreparedEvent,
  UninstallationAppliedEvent,
  UninstallationPreparedEvent,
} from '../../types/framework/plugin/setup/PluginSetupProcessor';

export type EventName =
  | 'UpdateApplied'
  | 'UpdatePrepared'
  | 'InstallationApplied'
  | 'InstallationPrepared'
  | 'UninstallationApplied'
  | 'UninstallationPrepared';
