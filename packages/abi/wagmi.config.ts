import {defineConfig} from '@wagmi/cli';
import {hardhat} from '@wagmi/cli/plugins';
import * as dotenv from 'dotenv';

if (!process.env.PROTOCOL_VERSION) {
  dotenv.config({path: __dirname + '/.env'});
}
export default defineConfig({
  // using abi instead of generated to avoid being ignored by git
  out: `generated/${process.env.PROTOCOL_VERSION}.ts`,
  plugins: [
    hardhat({
      artifacts: `../contracts/artifacts/@aragon/osx-${process.env.PROTOCOL_VERSION}`,
      project: '../contracts',
    }),
  ],
});
