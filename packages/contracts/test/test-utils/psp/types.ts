import {Operation} from '../../core/permission/permission-manager';
import {BytesLike} from 'ethers';

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
  Uninstallation,
}

export type VersionTag = [number, number];

// PluginRepo, release, build
// TODO: maybe find a way so it expects the address of specific plugin setups.
export type PluginRepoPointer = [string, number, number];
