import {
  AllDeployments,
  collectProxyWithImplementation,
  fetchImplementations,
  fetchProxies,
  generateExplorerIsThisAProxyURL,
  getApiKey,
  getChainBlockExplorerDetails,
} from '../../utils/etherscan';
import {expect} from '../chai-setup';
import _mockDeployments from './mocks/mock-deployments.json';
import {ChainConfig} from '@nomicfoundation/hardhat-verify/dist/src/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

describe('Verifying Proxies', () => {
  const deployments = _mockDeployments as unknown as AllDeployments;
  const expectedProxies = [
    {
      name: 'ManagementDAOProxy',
      address: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
    },
    {
      name: 'DAOENSSubdomainRegistrarProxy',
      address: '0x9a676e781a523b5d0c0e43731313a708cb607508',
    },
    {
      name: 'PluginENSSubdomainRegistrarProxy',
      address: '0x959922be3caee4b8cd9a407cc3ac1c251c2007b1',
    },
    {
      name: 'DAORegistryProxy',
      address: '0x3aa5ebb10dc797cac828524e59a333d0a371443c',
    },
    {
      name: 'PluginRepoRegistryProxy',
      address: '0x59b670e9fa9d0a427751af201d676719a970857b',
    },
  ];

  const expectedImplementations = [
    {
      name: 'ManagementDAOProxy_Implementation',
      address: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
    },
    {
      name: 'DAOENSSubdomainRegistrarProxy_Implementation',
      address: '0x0dcd1bf9a1b36ce34237eeafef220932846bcd82',
    },
    {
      name: 'PluginENSSubdomainRegistrarProxy_Implementation',
      address: '0x0b306bf915c4d645ff596e518faf3f9669b97016',
    },
    {
      name: 'DAORegistryProxy_Implementation',
      address: '0x68b1d87f95878fe05b998f19b66f4baba5de1aed',
    },
    {
      name: 'PluginRepoRegistryProxy_Implementation',
      address: '0xc6e7df5e7b4f2a278906862b61205850344d4e7d',
    },
  ];

  const expectedNames = [
    'ManagementDAO',
    'DAOENSSubdomainRegistrar',
    'PluginENSSubdomainRegistrar',
    'DAORegistry',
    'PluginRepoRegistry',
  ];

  it('Finds a list of proxies in the correct format', () => {
    expect(fetchProxies(deployments)).to.deep.eq(expectedProxies);
  });

  it('Same for implementations', () => {
    expect(fetchImplementations(deployments)).to.deep.eq(
      expectedImplementations
    );
  });

  it('Collects proxies with implementations', () => {
    const actual = collectProxyWithImplementation(deployments);

    // all the names are in the actual
    expect(actual.map(i => i.name)).to.deep.eq(expectedNames);

    // check the contents
    for (const item of actual) {
      const {name} = item;

      // no extra names
      expect(expectedNames).to.include(name);

      // proxy is the correct one
      const proxy = expectedProxies.find(p => p.name === `${name}Proxy`);
      expect(proxy).to.not.be.undefined;
      expect(proxy?.address).to.eq(item.proxy.address);

      // implementation is the correct one
      const implementation = expectedImplementations.find(
        i => i.name === `${name}Proxy_Implementation`
      );
      expect(implementation).to.not.be.undefined;
      expect(implementation?.address).to.eq(item.implementation?.address);
    }
  });

  const customChains = [
    {chainId: 1337, network: 'localhost'},
    // Add custom chains as needed
  ];

  describe('getChainBlockExplorerDetails', () => {
    it('should throw if chainId is not found', () => {
      const hre: unknown = {
        network: {config: {chainId: 9999}}, // An unlikely chain ID for testing
        config: {etherscan: {customChains}},
      };

      expect(() =>
        getChainBlockExplorerDetails(hre as HardhatRuntimeEnvironment)
      ).to.throw(
        'ChainId 9999 not supported. Please add the chain details to the hardhat config.'
      );
    });

    it('should throw an error if chainId is not provided', () => {
      const hre: unknown = {
        network: {config: {}}, // Missing chainId
        config: {etherscan: {customChains: customChains}},
      };

      expect(() =>
        getChainBlockExplorerDetails(hre as HardhatRuntimeEnvironment)
      ).revertedWith('Could not get chainId from Hardhat Runtime Environment.');
    });

    it('should return the correct ChainConfig for a valid chainId', () => {
      const result = getChainBlockExplorerDetails({
        network: {config: {chainId: 1}}, // A chain ID we've defined in customChains
        config: {etherscan: {}},
      } as HardhatRuntimeEnvironment);
      expect(result.network).to.eq('mainnet');

      const result2 = getChainBlockExplorerDetails({
        network: {config: {chainId: 137}}, // A chain ID we've defined in customChains
        config: {etherscan: {}},
      } as HardhatRuntimeEnvironment);
      expect(result2.network).to.eq('polygon');
    });
  });

  describe('getApiKey', () => {
    const mockChain = {network: 'rinkeby'} as ChainConfig;

    it('API Key Found in Hardhat Config', () => {
      const hre: unknown = {
        config: {etherscan: {apiKey: {rinkeby: 'hardhat-api-key'}}},
        userConfig: {},
      };

      const apiKey = getApiKey(hre as HardhatRuntimeEnvironment, mockChain);
      expect(apiKey).to.equal('hardhat-api-key');
    });

    it('API Key Found in User Config', () => {
      const hre: unknown = {
        config: {etherscan: {}},
        userConfig: {etherscan: {apiKey: {rinkeby: 'user-api-key'}}},
      };

      const apiKey = getApiKey(hre as HardhatRuntimeEnvironment, mockChain);
      expect(apiKey).to.equal('user-api-key');
    });

    it('API Key Missing for Network', () => {
      const hre: unknown = {
        config: {etherscan: {apiKey: {mainnet: 'mainnet-api-key'}}},
        userConfig: {},
      };

      expect(() =>
        getApiKey(hre as HardhatRuntimeEnvironment, mockChain)
      ).to.throw(
        `${mockChain.network} not supported. Please add the API key to the hardhat config.`
      );
    });

    it('API Keys Not Configured', () => {
      const hre: unknown = {
        config: {etherscan: {}},
        userConfig: {},
      };

      expect(() =>
        getApiKey(hre as HardhatRuntimeEnvironment, mockChain)
      ).to.throw(`Missing Etherscan API keys in the hardhat config.`);
    });
  });

  describe('generateExplorerIsThisAProxyURL', () => {
    // Mock HRE for Mainnet
    const hreMainnet: unknown = {
      network: {name: 'mainnet', config: {chainId: 1}},
      config: {etherscan: {apiKey: {mainnet: 'mainnet-api-key'}}},
    };

    // Mock HRE for Arbitrum One
    const hreArbitrumOne: unknown = {
      network: {name: 'arbitrumOne', config: {chainId: 42161}},
      config: {etherscan: {apiKey: {arbitrumOne: 'arbitrum-api-key'}}},
    };

    // Mock HRE for Sepolia
    const hreSepolia: unknown = {
      network: {name: 'sepolia', config: {chainId: 11155111}},
      config: {etherscan: {apiKey: {sepolia: 'sepolia-api-key'}}},
    };

    it('should generate the correct URL for Mainnet', () => {
      const url = generateExplorerIsThisAProxyURL(
        hreMainnet as HardhatRuntimeEnvironment
      );
      expect(url).to.equal(
        'https://api.etherscan.io/api?module=contract&action=verifyproxycontract&apikey=mainnet-api-key'
      );
    });

    it('should generate the correct URL for Arbitrum One', () => {
      const url = generateExplorerIsThisAProxyURL(
        hreArbitrumOne as HardhatRuntimeEnvironment
      );
      expect(url).to.equal(
        'https://api.arbiscan.io/api?module=contract&action=verifyproxycontract&apikey=arbitrum-api-key'
      );
    });

    it('should generate the correct URL for Sepolia', () => {
      const url = generateExplorerIsThisAProxyURL(
        hreSepolia as HardhatRuntimeEnvironment
      );
      expect(url).to.equal(
        'https://api-sepolia.etherscan.io/api?module=contract&action=verifyproxycontract&apikey=sepolia-api-key'
      );
    });
  });
});
