import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {TASK_ETHERSCAN_VERIFY} from 'hardhat-deploy';

import {verifyContract} from '../utils/etherscan';
import {getContractAddress} from './helpers';
import fs from 'fs/promises';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying contracts');

  const {deployments, ethers, run} = hre;

  const minutesDelay = 180000; // 3 minutes - Etherscan needs some time to process before trying to verify.

  console.log(
    `Waiting for ${
      minutesDelay / 60000
    } minutes, so Etherscan is aware of contracts before verifying`
  );

  await delay(minutesDelay);

  // Prepare contracts and addresses
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Prepare verify Array
  // So each verify is fired in a secuence
  // and await results
  const verifyObjArray: {address: string; args: any[any]}[] = [];

  console.log(`Reading deployments from deployments/${hre.network.name}`);
  const files = await fs.readdir(`deployments/${hre.network.name}`);
  for (const file of files) {
    const fileRead = await fs.readFile(file);
    const fileParsed = JSON.parse(fileRead.toString());
    verifyObjArray.push({
      address: fileParsed.address,
      args: fileParsed.args,
    });
  }

  console.log('Starting to verify now ... .. .');

  for (let index = 0; index < verifyObjArray.length; index++) {
    const element = verifyObjArray[index];

    console.log(
      `Verifying address ${element.address} with constructor argument ${element.args}.`
    );
    await verifyContract(element.address, element.args);

    // Etherscan Max rate limit is 1/5s,
    // use 6s just to be safe.
    console.log(
      `Delaying 6s, so we dont reach Etherscan's Max rate limit of 1/5s.`
    );
    delay(6000);
  }
};
export default func;
func.tags = ['Verify'];
func.runAtTheEnd = true;
func.skip = (hre: HardhatRuntimeEnvironment) =>
  Promise.resolve(
    hre.network.name === 'localhost' ||
      hre.network.name === 'hardhat' ||
      hre.network.name === 'coverage'
  );
