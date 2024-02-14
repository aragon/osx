import {
  daoDomainEnv,
  env,
  ethKeyEnv,
  managementDaoMultisigApproversEnv,
  managementDaoMultisigListedOnlyEnv,
  managementDaoMultisigMinApprovalsEnv,
  managementDaoSubdomainEnv,
  pluginDomainEnv,
} from '../../utils/environment';
import {expect} from 'chai';
import {network} from 'hardhat';
import {Network} from 'hardhat/types';

describe('detect network', () => {
  beforeEach(() => {
    process.env = {};
  });

  it('should detect the hardhat network', () => {
    expect(network.name).to.equal('hardhat');
  });

  it('provides default values for env vars if using the hardhat network', () => {
    const daoDomain = env(network, 'DAO_ENS_DOMAIN', 'dao.eth');
    expect(daoDomain).to.equal('dao.eth');
  });

  it('uses the environment variable if set', () => {
    process.env['DAO_ENS_DOMAIN'] = 'mydao.eth';
    const daoDomain = env(network, 'DAO_ENS_DOMAIN', 'dao.eth');
    expect(daoDomain).to.equal('mydao.eth');
  });

  it("Throws if env vars aren't set for the network other than hardhat", () => {
    const network = {name: 'mainnet'} as unknown as Network;
    delete process.env['DAO_ENS_DOMAIN'];
    expect(() => env(network, 'DAO_ENS_DOMAIN', 'dao.eth')).to.throw(
      'Missing env var: DAO_ENS_DOMAIN'
    );
  });

  it("Doesn't throw if env vars are set for the network other than hardhat", () => {
    const network: Network = {name: 'mainnet'} as unknown as Network;
    process.env['DAO_ENS_DOMAIN'] = 'mydao.eth';
    const daoDomain = env(network, 'DAO_ENS_DOMAIN', 'dao.eth');
    expect(daoDomain).to.equal('mydao.eth');
  });

  it('sets the correct fallbacks for each environment variable', () => {
    expect(daoDomainEnv(network)).to.equal('dao.eth');
    expect(pluginDomainEnv(network)).to.equal('plugin.eth');
    expect(managementDaoSubdomainEnv(network)).to.equal('management');
    expect(managementDaoMultisigApproversEnv(network)).to.equal(
      '0x6B2b5d4F0a40134189330e2d46a9CDD01C01AECD'
    );
    expect(managementDaoMultisigMinApprovalsEnv(network)).to.equal('1');
    expect(managementDaoMultisigListedOnlyEnv(network)).to.equal('true');
    expect(ethKeyEnv(network)).to.equal(
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    );
  });

  it('string interpolates the ENS subdomains', () => {
    const network: Network = {name: 'FakeNet'} as unknown as Network;
    process.env['FAKENET_DAO_ENS_DOMAIN'] = 'mydao.eth';
    process.env['FAKENET_PLUGIN_ENS_DOMAIN'] = 'myplugin.eth';
    expect(daoDomainEnv(network)).to.equal('mydao.eth');
    expect(pluginDomainEnv(network)).to.equal('myplugin.eth');
  });
});
