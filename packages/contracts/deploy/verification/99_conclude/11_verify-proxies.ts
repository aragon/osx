import {
  collectProxyWithImplementation,
  generateExplorerIsThisAProxyURL,
  handleLinkProxyRequest,
} from '../../../utils/etherscan';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

/**
 * This script runs after contract verification.
 * It searches deployments for proxies and their implementations and links them on Etherscan.
 * This avoids the need to call 'Is this a proxy?' for each contract using the UI.
 * This script can also be run as a standalone by invoking the 'VerifyProxies' tag.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nLinking Proxies on Etherscan');

  const url = generateExplorerIsThisAProxyURL(hre);
  const verifyData = collectProxyWithImplementation(
    await hre.deployments.all()
  );

  console.log(
    `Linking ${verifyData.length} proxies on Etherscan, please be patient.`
  );

  for (const {proxy, implementation} of verifyData) {
    await handleLinkProxyRequest(url, proxy, implementation);
  }
};
export default func;
func.tags = ['New', 'Verify', 'VerifyProxies'];
func.dependencies = ['VerifyContracts'];
func.runAtTheEnd = true;
func.skip = (hre: HardhatRuntimeEnvironment) =>
  Promise.resolve(
    hre.network.name === 'localhost' ||
      hre.network.name === 'hardhat' ||
      hre.network.name === 'coverage'
  );
