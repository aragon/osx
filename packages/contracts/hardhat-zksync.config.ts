import fs from 'fs';

import {networkExtensions} from './networks';

import {TestingFork} from './types/hardhat';
import RichAccounts from './utils/zksync-rich-accounts';
import {
  networks as commonNetworkConfigs,
  SupportedNetworks,
  addRpcUrlToNetwork,
} from '@aragon/osx-commons-configs';

import {extendEnvironment, HardhatUserConfig, task} from 'hardhat/config';
import type {NetworkUserConfig} from 'hardhat/types';

import '@nomicfoundation/hardhat-chai-matchers';

import '@matterlabs/hardhat-zksync-deploy';
import '@matterlabs/hardhat-zksync-solc';
import '@matterlabs/hardhat-zksync-node';

import '@nomicfoundation/hardhat-network-helpers';
import * as dotenv from 'dotenv';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'solidity-docgen';

import '@matterlabs/hardhat-zksync-upgradable';
import '@matterlabs/hardhat-zksync-ethers';
import '@matterlabs/hardhat-zksync-verify';

dotenv.config();

const ETH_KEY = process.env.ETH_KEY;
const accounts = ETH_KEY ? ETH_KEY.split(',') : [];

// check alchemy Api key existence
if (process.env.ALCHEMY_API_KEY) {
  addRpcUrlToNetwork(process.env.ALCHEMY_API_KEY);
} else {
  throw new Error('ALCHEMY_API_KEY in .env not set');
}

// add accounts to network configs
const hardhatNetworks: {[index: string]: NetworkUserConfig} =
  commonNetworkConfigs;
for (const network of Object.keys(hardhatNetworks) as SupportedNetworks[]) {
  if (network === SupportedNetworks.LOCAL) {
    continue;
  }
  hardhatNetworks[network].accounts = accounts;
  // hardhatNetworks[network].deploy = networkExtensions[network].deploy;
}

// Extend HardhatRuntimeEnvironment
extendEnvironment(hre => {
  const testingFork: TestingFork = {
    network: '',
    osxVersion: '',
    activeContracts: {},
  };
  hre.aragonToVerifyContracts = [];
  hre.managementDAOMultisigPluginAddress = ''; // TODO This must be removed after the deploy script got refactored (see https://github.com/aragon/osx/pull/582)
  hre.managementDAOActions = [];
  hre.testingFork = testingFork;
});

task('build-contracts').setAction(async (args, hre) => {
  await hre.run('compile');
  // TODO:Claudia (Is there a way without copying/pasting manually ? `paths` object below in the config
  // creates `build` folder correctly, but it always appends `zk` in the end.
  if (
    hre.network.name === 'zkTestnet' ||
    hre.network.name === 'zkLocalTestnet' ||
    hre.network.name === 'zkMainnet'
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

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
  zksolc: {
    compilerSource: 'binary',
    version: '1.5.0',
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
  defaultNetwork: 'zkLocalTestnet',
  networks: {
    zkLocalTestnet: {
      url: 'http://127.0.0.1:8011',
      ethNetwork: 'http://127.0.0.1:8545',
      zksync: true,
      deploy: ['./deploy/new'],
      gas: 15000000,
      blockGasLimit: 30000000,
      accounts: RichAccounts,
    },
    ...hardhatNetworks,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: 'USD',
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
    outputDir: 'docs/developer-portal/03-reference-guide',
    theme: 'markdown',
    pages: 'files',
    templates: 'docs/templates',
    collapseNewlines: true,
    exclude: ['test'],
  },
  mocha: {
    timeout: 90_000, // 90 seconds // increase the timeout for subdomain validation tests
  },
};

export default config;
