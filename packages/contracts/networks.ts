type NetworkExtension = {
  deploy: string[];
};

export const networkExtensions: {[index: string]: NetworkExtension} = {
  mainnet: {
    deploy: ['./deploy'],
  },
  sepolia: {
    deploy: ['./deploy'],
  },
  polygon: {
    deploy: ['./deploy'],
  },
  mumbai: {
    deploy: ['./deploy'],
  },
  baseMainnet: {
    deploy: ['./deploy'],
  },
  baseSepolia: {
    deploy: ['./deploy'],
  },
  arbitrum: {
    deploy: ['./deploy'],
  },
  arbitrumSepolia: {
    deploy: ['./deploy'],
  },
  zksyncMainnet: {
    deploy: ['./deploy'],
  },
  zksyncSepolia: {
    deploy: ['./deploy'],
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
