type NetworkExtension = {
  deploy: string[];
};

export const networkExtensions: {[index: string]: NetworkExtension} = {
  mainnet: {
    deploy: ['./deploy/update/to_v1.3.0', './deploy/verification'],
  },
  goerli: {
    deploy: ['./deploy/update/to_v1.3.0', './deploy/verification'],
  },
  sepolia: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  polygon: {
    deploy: ['./deploy/update/to_v1.3.0', './deploy/verification'],
  },
  mumbai: {
    deploy: ['./deploy/update/to_v1.3.0', './deploy/verification'],
  },
  baseMainnet: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  baseGoerli: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  arbitrum: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  baseSepolia: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  arbitrumSepolia: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  devSepolia: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  holesky: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  zksyncSepolia: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  zksyncMainnet: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
};
