import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {extendEnvironment, HardhatUserConfig, task} from 'hardhat/config';

import '@nomicfoundation/hardhat-chai-matchers';
import '@matterlabs/hardhat-zksync-deploy';
import '@matterlabs/hardhat-zksync-solc';
import "@matterlabs/hardhat-zksync-node";
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'solidity-docgen';

import {AragonPluginRepos, TestingFork} from './utils/types';
import {
  extractFactoryDepsByHardhatDeploy,
  extractFactoryDepsByZkSync,
} from './deploy/compare-factory-depths';

dotenv.config();

if (process.env.CONTRACTS_TARGET === 'zksync') {
  import('@matterlabs/hardhat-zksync-verify');
  import("@matterlabs/hardhat-zksync-upgradable");
} else {
  // import('@openzeppelin/hardhat-upgrades');
  import('@nomicfoundation/hardhat-verify');
}

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
    let allArtifacts = await hre.artifacts.getAllFullyQualifiedNames();
    // for (let i = 0; i < allArtifacts.length; i++) {
    //   let artifact = await hre.artifacts.readArtifact(allArtifacts[i]);

    //   let factoryDepthsByZkSync = await extractFactoryDepsByZkSync(
    //     hre,
    //     artifact
    //   );
    //   let factoryDepthsByHardhatDeploy =
    //     await extractFactoryDepsByHardhatDeploy(hre, artifact);
    //   if (factoryDepthsByZkSync.length != factoryDepthsByHardhatDeploy.length) {
    //     if (artifact.contractName != 'TokenFactory') {
    //       throw new Error("ZkSync Deployment won't work with hardhat-deploy");
    //     }
    //   }
    // }

    // Copying is useful due as no need to
    // change imports in deploy scripts.
    fs.cpSync('./build/artifacts-zk', './artifacts', {recursive: true});
    fs.cpSync('./build/cache-zk', './cache', {recursive: true});

    return;
  }

  fs.cpSync('./build/artifacts', './artifacts', {recursive: true});
  fs.cpSync('./build/cache', './cache', {recursive: true});
});

task('deploy-contracts').setAction(async (args, hre) => {
  await hre.run('build-contracts');
  await hre.run('deploy');
});

// task('test123').setAction(async (args, hre) => {
//   await hre.zkUpgrades.deployProxy(deployer.zkWallet, contract, [42], { initializer: "initialize" });

// })

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
    version: '1.4.0',
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
      url: 'http://localhost:8011',
      ethNetwork: 'http://localhost:8545',
      zksync: true,
      deployPaths: ['./deploy/new'],
      accounts: [
        // This is the rich account that already has lots of funds on the chain of port 8545
        '0x3d3cbc973389cb26f657686445bcc75662b415b656078503592ac8c1abb8810e',
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
    timeout: 60000, // 60 seconds // increase the timeout for subdomain validation tests
  },
};

export default config;
