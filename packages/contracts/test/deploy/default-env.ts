import {
  HARDHAT_ACCOUNTS,
  daoDomainEnv,
  env,
  ethKeyEnv,
  managementDaoMultisigApproversEnv,
  managementDaoMultisigListedOnlyEnv,
  managementDaoMultisigMinApprovalsEnv,
  managementDaoSubdomainEnv,
  pluginDomainEnv,
} from '../../utils/environment';
import {skipTestSuiteIfNetworkIsZkSync} from '../test-utils/skip-functions';
import {expect} from 'chai';
import {network} from 'hardhat';
import {Network} from 'hardhat/types';

skipTestSuiteIfNetworkIsZkSync('detect network', () => {
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
    expect(pluginDomainEnv(network)).to.equal('plugin.dao.eth');
    expect(managementDaoSubdomainEnv(network)).to.equal('management');
    expect(managementDaoMultisigApproversEnv(network)).to.equal(
      HARDHAT_ACCOUNTS[0].ADDRESS
    );
    expect(managementDaoMultisigMinApprovalsEnv(network)).to.equal('1');
    expect(managementDaoMultisigListedOnlyEnv(network)).to.equal('true');
    expect(ethKeyEnv(network)).to.equal(HARDHAT_ACCOUNTS[1].KEY);
  });

  it('string interpolates the ENS subdomains', () => {
    const network: Network = {name: 'FakeNet'} as unknown as Network;
    process.env['FAKENET_DAO_ENS_DOMAIN'] = 'mydao.eth';
    process.env['FAKENET_PLUGIN_ENS_DOMAIN'] = 'myplugin.dao.eth';
    expect(daoDomainEnv(network)).to.equal('mydao.eth');
    expect(pluginDomainEnv(network)).to.equal('myplugin.dao.eth');
  });
});
