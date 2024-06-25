import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {extendEnvironment, HardhatUserConfig, task} from 'hardhat/config';

import '@nomicfoundation/hardhat-chai-matchers';
import '@matterlabs/hardhat-zksync-deploy';
import '@matterlabs/hardhat-zksync-solc';
import '@matterlabs/hardhat-zksync-node';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'solidity-docgen';

// If you're running on zksync, import the below
import '@matterlabs/hardhat-zksync-upgradable';
import '@matterlabs/hardhat-zksync-ethers';
import '@matterlabs/hardhat-zksync-verify';

// If you're running on hardhat, import the following
// import '@nomicfoundation/hardhat-verify'
// import '@openzeppelin/hardhat-upgrades'

import {AragonPluginRepos, TestingFork} from './utils/types';

dotenv.config();

const ETH_KEY = process.env.ETH_KEY;
const accounts = ETH_KEY ? ETH_KEY.split(',') : [];

const networks = JSON.parse(
  fs.readFileSync(path.join(__dirname, './networks.json'), 'utf8')
);

// add accounts to network configs
for (const network of Object.keys(networks)) {
  networks[network].accounts = accounts;
}

task('build-contracts').setAction(async (args, hre) => {
  await hre.run('compile');
  if (
    hre.network.name === 'zkTestnet' ||
    hre.network.name === 'zkLocalTestnet'
  ) {
    // Copy zkSync specific build artifacts and cache to the default directories.
    // This ensures that we don't need to change import paths for artifacts in the project.
    fs.cpSync('./build/artifacts-zk', './artifacts', {
      recursive: true,
      force: true,
    });
    fs.cpSync('./build/cache-zk', './cache', {recursive: true, force: true});

    return;
  }

  fs.cpSync('./build/artifacts', './artifacts', {recursive: true, force: true});
  fs.cpSync('./build/cache', './cache', {recursive: true, force: true});
});

task('deploy-contracts').setAction(async (args, hre) => {
  await hre.run('build-contracts');
  await hre.run('deploy');
});

task('test-contracts').setAction(async (args, hre) => {
  await hre.run('build-contracts');
  const imp = await import('./test/test-utils/wrapper');
  
  const wrapper = await imp.Wrapper.create(
    hre.network.name,
    hre.ethers.provider
  );
  hre.wrapper = wrapper;

  await hre.run('test');
});

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
  zksolc: {
    version: '1.5.0',
    compilerSource: 'binary',
    settings: {},
  },
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
    zkLocalTestnet: {
      url: 'http://127.0.0.1:8011',
      ethNetwork: 'http://127.0.0.1:8545',
      zksync: true,
      deploy: ['./deploy/new'],
      gas: 15000000,
      blockGasLimit: 30000000,
      accounts: [
        // Rich accounts with pre-funded balances for the chain on port 8545.
        // These accounts are used for testing purposes and have sufficient funds.
        '0x3d3cbc973389cb26f657686445bcc75662b415b656078503592ac8c1abb8810e',
        '0x509ca2e9e6acf0ba086477910950125e698d4ea70fa6f63e000c5a22bda9361c',
        '0x71781d3a358e7a65150e894264ccc594993fbc0ea12d69508a340bc1d4f5bfbc',
        '0x379d31d4a7031ead87397f332aab69ef5cd843ba3898249ca1046633c0c7eefe',
        '0x105de4e75fe465d075e1daae5647a02e3aad54b8d23cf1f70ba382b9f9bee839',
        '0x7becc4a46e0c3b512d380ca73a4c868f790d1055a7698f38fb3ca2b2ac97efbb',
        '0xe0415469c10f3b1142ce0262497fe5c7a0795f0cbfd466a6bfa31968d0f70841',
        '0x4d91647d0a8429ac4433c83254fb9625332693c848e578062fe96362f32bfe91',
        '0x41c9f9518aa07b50cb1c0cc160d45547f57638dd824a8d85b5eb3bf99ed2bdeb',
        '0xb0680d66303a0163a19294f1ef8c95cd69a9d7902a4aca99c05f3e134e68a11a',
        // Additional accounts to ensure ethers.getSigners() returns 20 addresses.
        // zkSync only returns 10 accounts by default, which may break tests
        // that expect more. Adding these extra accounts prevents the need
        // to rewrite tests by maintaining a consistent 20 accounts.
        // ethers.getSigners() still return 20 addresses instead of 10.
        '0xec4822aa037f555ba18304bfcb6e30f3c981e730f57e7bad174312868952af90',
        '0x00058bfe32cbfe46e81a7c60178fae13078068b5a3a8e1441d47f7cb96665286',
        '0x4e0e42d531f61e25f12d64504ec5f021ead984c406fb5df97d27d813d11222a3',
        '0x9534dcb0f1e8c94c8c936b39d8a5667169df34d80966d13fe7ab9ef0c78c704a',
        '0xe6c08ed153863f48ccb843b6ba82e4880cd30a0874309a291d214a3a7d794499',
        '0x247411619389bbc301816f8928c568115c7e340daf950e241f447bcb68644f92',
        '0xaff4231bc7ef2141fe25aea9d957114064a778a1aeb54276ea8b6576b958d30f',
        '0x7c81899f9d699ce7eeea50ce47fbcf2bd84ae5d7d1b6eb01cd9eedd73eac13ee',
        '0xab5f8bf24c10790972c3a25c78e7ae070619d07c93dd189f86ccac67e82da837',
        '0x23d60e6c95faf5d242edeaed780868fb55f85556764dcc11082dd40d9a2ffd3f',
      ],
    },
    zkTestnet: {
      url: 'https://sepolia.era.zksync.dev',
      ethNetwork: 'sepolia',
      zksync: true,
      verifyURL:
        'https://explorer.sepolia.era.zksync.dev/contract_verification',
      deploy: ['./deploy/new', './deploy/verification'],
      accounts: accounts,
      forceDeploy: true,
    },
    zkMainnet: {
      url: 'https://mainnet.era.zksync.io',
      ethNetwork: 'mainnet',
      zksync: true,
      verifyURL:
        'https://zksync2-mainnet-explorer.zksync.io/contract_verification',
      deploy: ['./deploy/new', './deploy/verification'],
      accounts: accounts,
      forceDeploy: true,
    },
    ...networks,
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
    cache: './build/cache',
    artifacts: './build/artifacts',
    deploy: './deploy',
  },
  docgen: {
    outputDir: 'docs/osx/03-reference-guide',
    theme: 'markdown',
    pages: 'files',
    templates: 'docs/templates',
    collapseNewlines: true,
    exclude: ['test'],
  },
  mocha: {
    timeout: 6000000, // 60 seconds // increase the timeout for subdomain validation tests
  },
};

export default config;
