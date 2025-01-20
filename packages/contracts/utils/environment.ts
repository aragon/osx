import {HARDHAT_NETWORK_NAME} from 'hardhat/plugins';
import {Network} from 'hardhat/types';

export const isLocal = (network: Network): boolean =>
  [HARDHAT_NETWORK_NAME, 'localhost', 'coverage', 'zkLocalTestnet'].includes(
    network.name
  );

// known hardhat accounts and private keys unlocked by default in the HH node
export const HARDHAT_ACCOUNTS: Array<{KEY: string; ADDRESS: string}> = [
  {
    KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    ADDRESS: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  },
  {
    KEY: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    ADDRESS: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  },
] as const;

/**
 * Provides default values for environment variables if running in local
 * else requires that the environment variables are set
 * @param network The hardhat network object.
 * @param name The name of the environment variable.
 * @param defaultValue The fallback value to be used if not set and in development mode.
 * @returns The value of the environment variable, or a fallback if possible.
 */
export function env(
  network: Network,
  name: string,
  defaultValue: string
): string {
  const value = process.env[name];
  if (!isLocal(network) && !value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return process.env[name] || defaultValue;
}

/// Specific environment variables with hardcoded defaults in local environments

export const daoDomainEnv = (network: Network): string =>
  env(network, `${network.name.toUpperCase()}_DAO_ENS_DOMAIN`, 'dao.eth');

export const pluginDomainEnv = (network: Network): string =>
  env(
    network,
    `${network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`,
    'plugin.dao.eth'
  );

export const managementDaoSubdomainEnv = (network: Network): string =>
  env(network, 'MANAGEMENT_DAO_SUBDOMAIN', 'management');

export const managementDaoMultisigApproversEnv = (network: Network): string =>
  env(
    network,
    'MANAGEMENT_DAO_MULTISIG_APPROVERS',
    HARDHAT_ACCOUNTS[0].ADDRESS
  );

export const managementDaoMultisigMinApprovalsEnv = (
  network: Network
): string => env(network, 'MANAGEMENT_DAO_MULTISIG_MINAPPROVALS', '1');

export const managementDaoMultisigListedOnlyEnv = (network: Network): string =>
  env(network, 'MANAGEMENT_DAO_MULTISIG_LISTEDONLY', 'true');

export const ethKeyEnv = (network: Network): string =>
  env(network, 'ETH_KEY', HARDHAT_ACCOUNTS[1].KEY);
