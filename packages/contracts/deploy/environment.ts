import {Network} from 'hardhat/types';

/**
 * Provides default values for environment variables if running against a hardhat node
 * else requires that the environment variables are set
 * @param network the hardhat network object
 * @param name of the environment variable
 * @param defaultValue the fallback value to be used if not set and in development mode
 * @returns the value of the environment variable, or a fallback if possible
 */
export function envOr(
  network: Network,
  name: string,
  defaultValue: string
): string {
  const value = process.env[name];
  const isHardhat = network.name === 'hardhat';
  if (!isHardhat && !value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return process.env[name] || defaultValue;
}

export const ensOr = (
  network: Network,
  name: string,
  defaultValue: string
): string => envOr(network, name, defaultValue);
