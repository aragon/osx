import {hashHelpers} from '../../../utils/psp';
import {PermissionOperation, PluginRepoPointer, PreparationType} from './types';
import {BytesLike} from 'ethers';
import {defaultAbiCoder, keccak256, solidityPack} from 'ethers/lib/utils';

const ZERO_BYTES_HASH = keccak256(
  defaultAbiCoder.encode(
    ['bytes32'],
    ['0x0000000000000000000000000000000000000000000000000000000000000000']
  )
);

export function tagHash(release: number, build: number) {
  return keccak256(solidityPack(['uint8', 'uint16'], [release, build]));
}

export function hashPermissions(permissions: PermissionOperation[]) {
  return keccak256(
    defaultAbiCoder.encode(
      ['tuple(uint8,address,address,address,bytes32)[]'],
      [permissions]
    )
  );
}

export function getPluginInstallationId(dao: string, plugin: string) {
  return keccak256(
    defaultAbiCoder.encode(['address', 'address'], [dao, plugin])
  );
}

export function getPreparedSetupId(
  pluginRepoPointer: PluginRepoPointer,
  helpers: string[] | null,
  permissions: PermissionOperation[] | null,
  data: BytesLike,
  preparationType: PreparationType
) {
  return keccak256(
    defaultAbiCoder.encode(
      [
        'tuple(uint8, uint16)',
        'address',
        'bytes32',
        'bytes32',
        'bytes32',
        'uint8',
      ],
      [
        [pluginRepoPointer[1], pluginRepoPointer[2]],
        pluginRepoPointer[0],
        permissions !== null ? hashPermissions(permissions) : ZERO_BYTES_HASH,
        helpers !== null ? hashHelpers(helpers) : ZERO_BYTES_HASH,
        keccak256(data),
        preparationType,
      ]
    )
  );
}

export function getAppliedSetupId(
  pluginRepoPointer: PluginRepoPointer,
  helpers: string[]
) {
  return keccak256(
    defaultAbiCoder.encode(
      ['tuple(uint8, uint16)', 'address', 'bytes32'],
      [
        [pluginRepoPointer[1], pluginRepoPointer[2]],
        pluginRepoPointer[0],
        hashHelpers(helpers),
      ]
    )
  );
}
