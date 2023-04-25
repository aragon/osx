// Import and export the generated contract versions
const versions = {
  v0_7_0_alpha: () => import('../build/v0.7.0-alpha/contracts'),
  v1_0_0_mainnet_goerli: () =>
    import('../build/v1.0.0-mainnet-goerli/contracts'),
  // Add more versions here if needed
};

export default versions;
