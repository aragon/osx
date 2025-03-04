import {isLocal} from '../../../utils/environment';
import {verifyContract} from '../../../utils/etherscan';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying contracts');

  for (let index = 0; index < hre.aragonToVerifyContracts.length; index++) {
    const element = hre.aragonToVerifyContracts[index];

    console.log(
      `Verifying address ${element.address} with constructor argument ${element.args}.`
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
func.tags = ['New', 'Verify', 'VerifyEnd'];
func.runAtTheEnd = true;
func.skip = (hre: HardhatRuntimeEnvironment) =>
  Promise.resolve(isLocal(hre.network));
