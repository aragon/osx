import {HARDHAT_NETWORK_NAME} from 'hardhat/plugins';
import {Network} from 'hardhat/types';

/**
 * Provides default values for environment variables if running against a hardhat node
 * else requires that the environment variables are set
 * @param network the hardhat network object
 * @param name of the environment variable
 * @param defaultValue the fallback value to be used if not set and in development mode
 * @returns the value of the environment variable, or a fallback if possible
 */
export function env(
  network: Network,
  name: string,
  defaultValue: string
): string {
  const value = process.env[name];
  const isHardhat = network.name === HARDHAT_NETWORK_NAME;
  if (!isHardhat && !value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return process.env[name] || defaultValue;
}

/// Specific environment variables with hardcoded defaults

export const daoDomainEnv = (network: Network): string =>
  env(network, `${network.name.toUpperCase()}_DAO_ENS_DOMAIN`, 'dao.eth');

export const pluginDomainEnv = (network: Network): string =>
  env(network, `${network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`, 'plugin.eth');

export const managementDaoSubdomainEnv = (network: Network): string =>
  env(network, 'MANAGEMENT_DAO_SUBDOMAIN', 'management');

export const managementDaoMultisigApproversEnv = (network: Network): string =>
  env(
    network,
    'MANAGEMENT_DAO_MULTISIG_APPROVERS',
    // random address
    '0x6B2b5d4F0a40134189330e2d46a9CDD01C01AECD'
  );

export const managementDaoMultisigMinApprovalsEnv = (
  network: Network
): string => env(network, 'MANAGEMENT_DAO_MULTISIG_MINAPPROVALS', '1');

export const managementDaoMultisigListedOnlyEnv = (network: Network): string =>
  env(network, 'MANAGEMENT_DAO_MULTISIG_LISTEDONLY', 'true');
