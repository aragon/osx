import {defineConfig} from '@wagmi/cli';
import {hardhat} from '@wagmi/cli/plugins';

export default defineConfig({
  out: 'src/v1_3_0.ts',
  plugins: [
    hardhat({
      artifacts: '../contracts/artifacts/@aragon/osx-v1.3.0',
      project: '../contracts',
    }),
  ],
});
