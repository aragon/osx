import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import {HardhatUserConfig, task} from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'solidity-docgen';

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

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.10',
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
      blockGasLimit: 30000000,
      gasPrice: 8000000000,
    },
    ...networks,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_KEY || '',
      rinkeby: process.env.ETHERSCAN_KEY || '',
      goerli: process.env.ETHERSCAN_KEY || '',
      polygon: process.env.POLYGONSCAN_KEY || '',
      polygonMumbai: process.env.POLYGONSCAN_KEY || '',
      arbitrumOne: process.env.ARBISCAN_KEY || '',
      arbitrumTestnet: process.env.ARBISCAN_KEY || '',
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  docgen: {
    outputDir: 'docs/core/03-reference-guide',
    theme: 'markdown',
    pages: 'files',
    templates: 'docs/templates',
    collapseNewlines: true,
    exclude: ['test'],
  },
};

export default config;
