import {expect} from 'chai';
import {network} from 'hardhat';
import {Network} from 'hardhat/types';

/**
 * Provides default values for environment variables if running against a hardhat node
 * else requires that the environment variables are set
 * @param network the hardhat network object
 * @param name of the environment variable
 * @param defaultValue the fallback value to be used if not set and in development mode
 * @returns the value of the environment variable, or a fallback if possible
 */
function envOr(network: Network, name: string, defaultValue: string): string {
  const value = process.env[name];
  const isHardhat = network.name === 'hardhat';
  if (!isHardhat && !value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return process.env[name] || defaultValue;
}

describe('detect network', () => {
  it('should detect the hardhat network', () => {
    expect(network.name).to.equal('hardhat');
  });

  it('provides default values for env vars if using the hardhat network', () => {
    const daoDomain = envOr(network, 'DAO_ENS_DOMAIN', 'dao.eth');
    expect(daoDomain).to.equal('dao.eth');
  });

  it('uses the environment variable if set', () => {
    process.env['DAO_ENS_DOMAIN'] = 'mydao.eth';
    const daoDomain = envOr(network, 'DAO_ENS_DOMAIN', 'dao.eth');
    expect(daoDomain).to.equal('mydao.eth');
  });

  it("Throws if env vars aren't set for the network other than hardhat", () => {
    const network = {name: 'mainnet'} as unknown as Network;
    delete process.env['DAO_ENS_DOMAIN'];
    expect(() => envOr(network, 'DAO_ENS_DOMAIN', 'dao.eth')).to.throw(
      'Missing env var: DAO_ENS_DOMAIN'
    );
  });

  it("Doesn't throw if env vars are set for the network other than hardhat", () => {
    const network: Network = {name: 'mainnet'} as unknown as Network;
    process.env['DAO_ENS_DOMAIN'] = 'mydao.eth';
    const daoDomain = envOr(network, 'DAO_ENS_DOMAIN', 'dao.eth');
    expect(daoDomain).to.equal('mydao.eth');
  });
});
