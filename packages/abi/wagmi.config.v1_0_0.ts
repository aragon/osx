import {defineConfig} from '@wagmi/cli';
import {hardhat} from '@wagmi/cli/plugins';

export default defineConfig({
  out: 'src/v1_0_0.ts',
  plugins: [
    hardhat({
      artifacts: '../contracts/artifacts/@aragon/osx-v1.0.1',
      project: '../contracts',
    }),
  ],
});
