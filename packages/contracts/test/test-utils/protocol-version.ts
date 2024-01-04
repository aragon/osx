import {version} from '../../package.json';

// The protocol version number of contracts not having a `getProtocolVersion()` function because they don't inherit from `ProtocolVersion.sol` yet.
export const IMPLICIT_INITIAL_PROTOCOL_VERSION: [number, number, number] = [
  1, 0, 0,
];

/**
 * Returns the NPM version number from the `osx` package.json file
 */
export function osxContractsVersion(): [number, number, number] {
  const trimmedVersion = version.split('-')[0];
  const semver = trimmedVersion.split('.');
  return [Number(semver[0]), Number(semver[1]), Number(semver[2])];
}
