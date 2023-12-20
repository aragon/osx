import {Operation} from '../../../utils/types';
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

// release, build
export type VersionTag = [number, number];

// PluginRepo, release, build
export type PluginRepoPointer = [string, number, number];
