// Import and export the generated contract versions
// const versions = {
//   v0_7_0_alpha: {
//     typechain: () => import('../build/v0.7.0_alpha/typechain'),
//     active_contracts: () =>
//       import('../build/v0.7.0_alpha/active_contracts.json'),
//   },
//   v1_0_0_mainnet_goerli: {
//     typechain: () => import('../build/v1.0.0_mainnet_goerli/typechain'),
//     active_contracts: () =>
//       import('../build/v1.0.0_mainnet_goerli/active_contracts.json'),
//   },
//   v1_0_0_mumbai: {
//     typechain: () => import('../build/v1.0.0_mumbai/typechain'),
//     active_contracts: () =>
//       import('../build/v1.0.0_mumbai/active_contracts.json'),
//   },
//   // Add more versions here if needed
// };

// export default versions;

export * as v0_7_0_alpha_typechain from '../build/v0_7_0_alpha/typechain';
import * as v0_7_0_alpha_active_contracts from '../build/v0.7.0_alpha/active_contracts.json';

export * as v1_0_0_mainnet_goerli_typechain from '../build/v1_0_0_mainnet_goerli/typechain';
import * as v1_0_0_mainnet_goerli_active_contracts from '../build/v1_0_0_mainnet_goerli/active_contracts.json';

export * as v1_0_0_mumbai_typechain from '../build/v1_0_0_mumbai/typechain';
import * as v1_0_0_mumbai_active_contracts from '../build/v1_0_0_mumbai/active_contracts.json';

export {
  v0_7_0_alpha_active_contracts,
  v1_0_0_mainnet_goerli_active_contracts,
  v1_0_0_mumbai_active_contracts,
};
