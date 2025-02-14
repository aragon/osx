import {networkExtensions} from '../networks';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import HRE from 'hardhat';
import {file} from 'tmp-promise';

dotenv.config();

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const verifyContract = async (
  address: string,
  constructorArguments: any[],
  contract?: string
) => {
  const currentNetwork = HRE.network.name;

  if (!Object.keys(networkExtensions).includes(currentNetwork)) {
    throw new Error(
      `Current network ${currentNetwork} not supported. Please change to one of the next networks: ${Object.keys(
        networkExtensions
      ).join(', ')}`
    );
  }

  try {
    const msDelay = 500; // Minimum delay between tasks
    const times = 2; // Number of retries

    // Write a temporary file to host constructor parameters
    const {fd, path, cleanup} = await file({
      prefix: 'verify-params-',
      postfix: '.js',
    });

    fs.writeSync(
      fd,
      `module.exports = ${JSON.stringify([...constructorArguments])};`
    );

    const params = {
      contract,
      address,
      constructorArgs: path,
    };

    // Determine if this network requires Etherscan or Subscan
    if (networkExtensions[currentNetwork].explorer === 'etherscan' || '') {
      await runTaskWithRetry('verify', params, times, msDelay, cleanup);
    } else if (networkExtensions[currentNetwork].explorer === 'subscan') {
      await runTaskWithRetry(verifyOnSubscan, params, times, msDelay, cleanup);
    } else {
      throw new Error(`Explorer not supported for network ${currentNetwork}`);
    }
  } catch (error) {
    console.warn(`Verify task error: ${error}`);
  }
};

// Function to verify contracts on Subscan API
const verifyOnSubscan = async (params: any) => {
  const {address, contract, constructorArgs} = params;
  const SUBSCAN_API_KEY = process.env.SUBSCAN_API_KEY;
  const network = HRE.network.name;

  // Load contract metadata
  const sourceCode = fs.readFileSync(
    `artifacts/contracts/${contract}/${contract}.json`,
    'utf8'
  );
  const contractMetadata = JSON.parse(sourceCode);

  const payload = {
    address: address,
    source_code: contractMetadata.source,
    compiler_version: contractMetadata.compiler.version,
    optimization_used: contractMetadata.compiler.optimization ? 1 : 0,
    runs: contractMetadata.compiler.runs,
    constructor_arguments: fs.readFileSync(constructorArgs, 'utf8'),
  };

  try {
    console.log(`Verifying contract on Subscan: ${address}`);
    const response = await axios.post(
      `https://api.subscan.io/api/v2/contract/verify`,
      payload,
      {
        headers: {
          'X-API-Key': SUBSCAN_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Verification Response:', response.data);
  } catch (error: any) {
    console.error(
      'Error verifying contract:',
      error.response?.data || error.message || error
    );
  }
};

export const runTaskWithRetry = async (
  task: (params: any) => Promise<void> | string,
  params: any,
  times: number,
  msDelay: number,
  cleanup: () => void
) => {
  let counter = times;
  await delay(msDelay);

  try {
    if (times) {
      if (typeof task === 'string') {
        await HRE.run(task, params);
      } else {
        await task(params);
      }
      cleanup();
    } else {
      cleanup();
      console.error(
        'Errors after all retries, check the logs for more information.'
      );
    }
  } catch (error: any) {
    counter--;
    console.log(`Retrying attempts left: ${counter}.`);
    console.error(error.message);
    await runTaskWithRetry(task, params, counter, msDelay, cleanup);
  }
};
