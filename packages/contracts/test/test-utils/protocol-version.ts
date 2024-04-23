import {version} from '../../package.json';

/**
 * Returns the NPM version number from the `osx` package.json file
 */
export function osxContractsVersion(): [number, number, number] {
  const trimmedVersion = version.split('-')[0];
  const semver = trimmedVersion.split('.');
  return [Number(semver[0]), Number(semver[1]), Number(semver[2])];
}
