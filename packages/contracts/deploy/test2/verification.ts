import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {verifyContract} from '../../utils/etherscan';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying contracts');

  hre.aragonToVerifyContracts.push({
    address: '0xc9E5C91089c56Fdb82B6415369F721878A5FB660',
    args: [
      '0xDd862202fF9329931bd3372FFE5dB73965D9fd1D',
      '0x1DE2Dc28891730643EA779Be548F8dfD2D3ea06B',
    ],
  });
  for (let index = 0; index < hre.aragonToVerifyContracts.length; index++) {
    const element = hre.aragonToVerifyContracts[index];

    console.log(
      `Verifying contract ${element.contract} at address ${element.address} with constructor arguments ${element.args}.`
    );
    await verifyContract(element.address, element.args || [], element.contract);

    // Etherscan Max rate limit is 1/5s,
    // use 6s just to be safe.
    console.log(
      `Delaying 6s, so we dont reach Etherscan's Max rate limit of 1/5s.`
    );
    await delay(6000);
  }
};
export default func;
func.tags = ['New', 'Verify'];
func.runAtTheEnd = true;
func.skip = (hre: HardhatRuntimeEnvironment) =>
  Promise.resolve(
    hre.network.name === 'localhost' ||
      hre.network.name === 'hardhat' ||
      hre.network.name === 'coverage'
  );
