import {version} from '../../package.json';

// The current protocol version number as specified by the `getProtocolVersion()` function in `ProtocolVersion.sol`.
export const CURRENT_PROTOCOL_VERSION: [number, number, number] = [1, 4, 0];

// The protocol version number of contracts not having a `getProtocolVersion()` function because they don't inherit from `ProtocolVersion.sol` yet.
export const IMPLICIT_INITIAL_PROTOCOL_VERSION: [number, number, number] = [
  1, 0, 0,
];

/**
 * Returns the NPM version number from the `osx-commons-contracts` package.json file
 */
export function osxCommonsContractsNPMVersion(): [number, number, number] {
  const trimmedVersion = version.split('-')[0];
  const semver = trimmedVersion.split('.');
  return [Number(semver[0]), Number(semver[1]), Number(semver[2])];
}
