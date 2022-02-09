import * as dotenv from 'dotenv';

import {HardhatUserConfig, task} from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

dotenv.config();

const ETH_KEY = process.env.ETH_KEY;
const accounts = ETH_KEY ? ETH_KEY.split(',') : [];

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
        "*": {
          "*": ["storageLayout"]
        }
      },
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
    },
    mainnet: {
      url: process.env.MAINNET_URL || '',
      accounts,
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || '',
      accounts,
    },
    arbitrum: {
      url: process.env.ARBITRUM_URL || '',
      accounts,
    },
    arbitrum_rinkeby: {
      url: process.env.ARBITRUM_RINKEBY_URL || '',
      accounts,
    },
    polygon: {
      url: process.env.POLYGON_URL || '',
      accounts,
    },
    polygon_mumbai: {
      url: process.env.POLYGON_MUMBAI_URL || '',
      accounts,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
  namedAccounts: {
    deployer: 0,
  },
};

export default config;
