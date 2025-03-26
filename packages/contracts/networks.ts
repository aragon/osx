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
  holesky: {
    deploy: ['./deploy'],
  },
  linea: {
    deploy: ['./deploy'],
  },
  mode: {
    deploy: ['./deploy'],
  },
  agungTestnet: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  peaq: {
    deploy: ['./deploy/new', './deploy/verification'],
  },
  localhost: {
    deploy: ['./deploy/new'],
  },
};
