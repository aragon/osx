import {isLocal} from '../../../utils/environment';
import {
  collectProxyWithImplementation,
  generateExplorerIsThisAProxyURL,
  handleLinkProxyRequest,
} from '../../../utils/etherscan';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

/**
 * This script can be run manually after the deployment of the contracts and contract verification,
 * call `yarn verifyProxies --network <network>` to run this script.
 *
 * It searches deployments for proxies and their implementations and links them on Etherscan.
 * This avoids the need to call 'Is this a proxy?' for each contract using the UI.
 * The script will request the linkage for all proxies and implementations and return a GUID to check the status
 * of the request.
 *
 * The API is inconsistent when linking proxies, so we don't include this as part of the default deployment process.
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

func.skip = (hre: HardhatRuntimeEnvironment) => {
  const verifyProxies = process.env.VERIFY_PROXIES === 'true';
  return Promise.resolve(isLocal(hre.network) || !verifyProxies);
};
