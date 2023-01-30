import {Operation} from '../../core/permission/permission-manager';
import {BytesLike, utils, constants} from 'ethers';
import {
  DAO,
  PluginSetupProcessor,
  PluginRepoRegistry,
  PluginUUPSUpgradeableSetupV1Mock,
  PluginUUPSUpgradeableSetupV1MockBad,
  PluginUUPSUpgradeableSetupV2Mock,
  PluginUUPSUpgradeableSetupV3Mock,
  PluginUUPSUpgradeableSetupV4Mock,
  PluginCloneableSetupV1Mock,
  PluginCloneableSetupV2Mock,
} from '../../../typechain';
export type PermissionOperation = {
  operation: Operation;
  where: string;
  who: string;
  condition: string;
  permissionId: BytesLike;
};

export enum PreparationType {
  None,
  Installation,
  Update,
  Uninstallation
}

// PluginRepo, release, build
// TODO: maybe find a way so it expects the address of specific plugin setups.
export type PluginRepoPointer = [string, number, number];
