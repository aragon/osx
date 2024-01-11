import networks, {ContractsNetworkConfig} from './networks';
import {AragonPluginRepos, TestingFork} from './utils/types';
import {NetworkConfigs} from '@aragon/osx-commons-configs';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-network-helpers';
import '@nomicfoundation/hardhat-verify';
import '@openzeppelin/hardhat-upgrades';
import * as dotenv from 'dotenv';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import {extendEnvironment, HardhatUserConfig} from 'hardhat/config';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import 'solidity-coverage';
import 'solidity-docgen';

type HardhatNetworksExtension = ContractsNetworkConfig & {
  accounts?: string[];
};

dotenv.config();

const ETH_KEY = process.env.ETH_KEY;
const accounts = ETH_KEY ? ETH_KEY.split(',') : [];

// add accounts to network configs
const hardhatNetworks: NetworkConfigs<HardhatNetworksExtension> = networks;
for (const network of Object.keys(networks)) {
  hardhatNetworks[network].accounts = accounts;
}

// Extend HardhatRuntimeEnvironment
extendEnvironment((hre: HardhatRuntimeEnvironment) => {
  const aragonPluginRepos: AragonPluginRepos = {
    'address-list-voting': '',
    'token-voting': '',
    admin: '',
    multisig: '',
  };
  const testingFork: TestingFork = {
    network: '',
    osxVersion: '',
    activeContracts: {},
  };
  hre.aragonPluginRepos = aragonPluginRepos;
  hre.aragonToVerifyContracts = [];
  hre.managingDAOMultisigPluginAddress = '';
  hre.managingDAOActions = [];
  hre.testingFork = testingFork;
});

const ENABLE_DEPLOY_TEST = process.env.TEST_UPDATE_DEPLOY_SCRIPT !== undefined;

console.log('Is deploy test is enabled: ', ENABLE_DEPLOY_TEST);

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 2000,
      },
      outputSelection: {
        '*': {
          '*': ['storageLayout'],
        },
      },
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      blockGasLimit: 3000000000, // really high to test some things that are only possible with a higher block gas limit
      gasPrice: 80000000000,
      deploy: ENABLE_DEPLOY_TEST
        ? ['./deploy']
        : ['./deploy/new', './deploy/verification'],
    },
    ...hardhatNetworks,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: 'USD',
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_KEY || '',
      rinkeby: process.env.ETHERSCAN_KEY || '',
      goerli: process.env.ETHERSCAN_KEY || '',
      sepolia: process.env.ETHERSCAN_KEY || '',
      polygon: process.env.POLYGONSCAN_KEY || '',
      polygonMumbai: process.env.POLYGONSCAN_KEY || '',
      baseMainnet: process.env.BASESCAN_KEY || '',
      baseGoerli: process.env.BASESCAN_KEY || '',
      baseSepolia: process.env.BASESCAN_KEY || '',
      arbitrumOne: process.env.ARBISCAN_KEY || '',
      arbitrumGoerli: process.env.ARBISCAN_KEY || '',
      arbitrumSepolia: process.env.ARBISCAN_KEY || '',
    },
    customChains: [
      {
        network: 'baseMainnet',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
      {
        network: 'baseGoerli',
        chainId: 84531,
        urls: {
          apiURL: 'https://api-goerli.basescan.org/api',
          browserURL: 'https://goerli.basescan.org',
        },
      },
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
      {
        network: 'arbitrumSepolia',
        chainId: 421614,
        urls: {
          apiURL: 'https://api-sepolia.arbiscan.io/api',
          browserURL: 'https://sepolia.arbiscan.io',
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
  },
  paths: {
    sources: './src',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
    deploy: './deploy',
  },
  docgen: {
    outputDir: 'docs/developer-portal/03-reference-guide',
    theme: 'markdown',
    pages: 'files',
    templates: 'docs/templates',
    collapseNewlines: true,
    exclude: ['test'],
  },
  mocha: {
    timeout: 60000, // 60 seconds // increase the timeout for subdomain validation tests
  },
};

export default config;
