// Import and export the generated contract versions
const versions = {
  v0_7_0_alpha: {
    types: () => import('../build/v0.7.0_alpha/typechain'),
    active_contracts: () =>
      import('../build/v0.7.0_alpha/active_contracts.json'),
  },
  v1_0_0_mainnet_goerli: {
    types: () => import('../build/v1.0.0_mainnet_goerli/typechain'),
    active_contracts: () =>
      import('../build/v1.0.0_mainnet_goerli/active_contracts.json'),
  },
  v1_0_0_mumbai: {
    types: () => import('../build/v1.0.0_mumbai/typechain'),
    active_contracts: () =>
      import('../build/v1.0.0_mumbai/active_contracts.json'),
  },
  // Add more versions here if needed
};

export default versions;
