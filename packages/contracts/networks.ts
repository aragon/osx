import {NetworkConfigs, networks} from '@aragon/osx-commons-configs';

export type ContractsNetworkConfig = {
  deploy: string[];
};

const networkExtensions: NetworkConfigs<ContractsNetworkConfig> = {
  mainnet: {
    ...networks.mainnet,
    deploy: ['./deploy/update/to_v1.3.0', './deploy/verification'],
  },
  goerli: {
    ...networks.goerli,
    deploy: ['./deploy/update/to_v1.3.0', './deploy/verification'],
  },
  sepolia: {
    ...networks.sepolia,
    deploy: ['./deploy/new', './deploy/verification'],
  },
  polygon: {
    ...networks.polygon,
    deploy: ['./deploy/update/to_v1.3.0', './deploy/verification'],
  },
  mumbai: {
    ...networks.mumbai,
    deploy: ['./deploy/update/to_v1.3.0', './deploy/verification'],
  },
  baseMainnet: {
    ...networks.baseMainnet,
    deploy: ['./deploy/new', './deploy/verification'],
  },
  baseGoerli: {
    ...networks.baseGoerli,
    deploy: ['./deploy/new', './deploy/verification'],
  },
  arbitrum: {
    ...networks.arbitrum,
    deploy: ['./deploy/new', './deploy/verification'],
  },
  arbitrumGoerli: {
    ...networks.arbitrumGoerli,
    deploy: ['./deploy/new', './deploy/verification'],
  },
};

export default networkExtensions;
