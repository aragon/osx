import HRE from 'hardhat';
import fs from 'fs';
import {file} from 'tmp-promise';
import path from 'path';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const verifyContract = async (
  address: string,
  constructorArguments: any[]
) => {
  const currentNetwork = HRE.network.name;

  const networks = await fs.promises.readFile(
    path.join(__dirname, '../networks.json'),
    'utf8'
  );
  const networksJSON = JSON.parse(networks.toString());
  if (!Object.keys(networksJSON).includes(currentNetwork)) {
    throw Error(
      `Current network ${currentNetwork} not supported. Please change to one of the next networks: ${Object.keys(
        networksJSON
      ).join(',')}`
    );
  }

  try {
    const msDelay = 500; // minimum dely between tasks
    const times = 2; // number of retries

    // Write a temporal file to host complex parameters for hardhat-etherscan https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-etherscan#complex-arguments
    const {fd, path, cleanup} = await file({
      prefix: 'verify-params-',
      postfix: '.js',
    });
    fs.writeSync(
      fd,
      `module.exports = ${JSON.stringify([...constructorArguments])};`
    );

    const params = {
      address: address,
      constructorArgs: path,
    };
    await runTaskWithRetry('verify', params, times, msDelay, cleanup);
  } catch (error) {
    console.warn(`Verify task error: ${error}`);
  }
};

export const runTaskWithRetry = async (
  task: string,
  params: any,
  times: number,
  msDelay: number,
  cleanup: () => void
) => {
  let counter = times;
  await delay(msDelay);

  try {
    if (times) {
      await HRE.run(task, params);
      cleanup();
    } else {
      cleanup();
      console.error(
        'Errors after all the retries, check the logs for more information.'
      );
    }
  } catch (error: any) {
    counter--;
    // This is not the ideal check, but it's all that's possible for now https://github.com/nomiclabs/hardhat/issues/1301
    if (!/already verified/i.test(error.message)) {
      console.log(`Retrying attemps: ${counter}.`);
      console.error(error.message);
      await runTaskWithRetry(task, params, counter, msDelay, cleanup);
    }
  }
};
