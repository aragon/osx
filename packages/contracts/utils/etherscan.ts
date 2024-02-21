import networks from '../networks';
import {
  AllDeployments,
  NameAndAddress,
  CollectedProxyWithImplementation,
} from '../types/etherscan';
import {ChainConfig} from '@nomicfoundation/hardhat-verify/dist/src/types';
import axios, {AxiosRequestConfig} from 'axios';
import fs from 'fs';
import HRE from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import qs from 'qs';
import {file} from 'tmp-promise';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const verifyContract = async (
  address: string,
  constructorArguments: any[],
  contract?: string
) => {
  const currentNetwork = HRE.network.name;

  if (!Object.keys(networks).includes(currentNetwork)) {
    throw Error(
      `Current network ${currentNetwork} not supported. Please change to one of the next networks: ${Object.keys(
        networks
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
      contract,
      address,
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

/**
 * @returns All contracts with the name containing 'Proxy' from the deployments stored on disk
 */
export const fetchProxies = (deployments: AllDeployments) =>
  Object.entries(deployments)
    .map(([name, deploy]) => ({name, address: deploy.address.toLowerCase()}))
    .filter(deployment => deployment.name.match(/Proxy$/g))
    // Naming conventions is to call the base contract XXXProxy, but HH Deploy
    // will suffix _Proxy (leading to XXXProxy_Proxy).
    // This second filter removes that noise as they're the same contract anyway.
    .filter(deployment => !deployment.name.match(/Proxy\_Proxy$/g));

/**
 * @returns All contracts with the name containing 'Implementation' from the deployments stored on disk
 */
export const fetchImplementations = (deployments: AllDeployments) =>
  Object.entries(deployments)
    .map(([name, deploy]) => ({name, address: deploy.address.toLowerCase()}))
    .filter(deployment => deployment.name.match(/Implementation$/g));

export const collectProxyWithImplementation = (
  deployments: AllDeployments
): CollectedProxyWithImplementation[] => {
  const proxies = fetchProxies(deployments);
  const implementations = fetchImplementations(deployments);

  // join based on the first part of the name
  return proxies.map(proxy => {
    const baseName = proxy.name.replace('Proxy', '');
    return {
      name: baseName,
      proxy,
      implementation: implementations.find(imp => imp.name.includes(baseName)),
    };
  });
};

/**
 * @returns the block explorer chain config for the current network the hre is connected to.
 * The chain config comes from the hardhat config or the user config, paired with the default
 * chain details exported from the hardhat-verify package.
 */
export const getChainBlockExplorerDetails = (
  hre: HardhatRuntimeEnvironment
): ChainConfig => {
  const currentChainId = hre.network.config.chainId;

  if (!currentChainId) {
    throw new Error('Could not get chainId from Hardhat Runtime Environment.');
  }
  // deep copy to avoid modifying the original array
  const customChainsCopy = Object.assign([], hre.config.etherscan.customChains);
  const currentChainConfig = [
    // custom chains has higher precedence than builtin chains
    ...customChainsCopy.reverse(), // the last entry has higher precedence
    ...builtinChains,
  ].find(({chainId}) => chainId === currentChainId);

  if (!currentChainConfig) {
    throw new Error(
      `ChainId ${currentChainId} not supported. Please add the chain details to the hardhat config.`
    );
  }

  return currentChainConfig || null;
};

/**
 * @returns The Etherscan API key for the current network the hre is connected to.
 * We look for this key in the hardhat config, but it must be set in the user's `.env` file.
 */
export const getApiKey = (
  hre: HardhatRuntimeEnvironment,
  chain: ChainConfig
): string => {
  // check the apiKey first in the hardhat config, then in the user config
  const apiKeyByNetwork = (hre.config.etherscan.apiKey ??
    hre.userConfig.etherscan?.apiKey) as Record<string, string>;

  if (!apiKeyByNetwork) {
    throw new Error(`Missing Etherscan API keys in the hardhat config.`);
  }

  if (!(chain.network in apiKeyByNetwork)) {
    throw new Error(
      `${chain.network} not supported. Please add the API key to the hardhat config.`
    );
  }
  return apiKeyByNetwork[chain.network];
};

/**
 * @returns The API endpoint to hit for the given chain to verify a proxy contract's implementation.
 */
export const generateExplorerIsThisAProxyURL = (
  hre: HardhatRuntimeEnvironment
): string => {
  const chain = getChainBlockExplorerDetails(hre);
  const apiKey = getApiKey(hre, chain);

  const baseUrl = chain.urls.apiURL;

  return (
    baseUrl + `?module=contract&action=verifyproxycontract&apikey=${apiKey}`
  );
};

export const generateVerifyRequest = (
  url: string,
  proxy: string,
  implementation: string
): AxiosRequestConfig => {
  return {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    data: qs.stringify({
      address: proxy,
      expectedimplementation: implementation,
    }),
    url,
  };
};

/**
 * Sends a message to the block explorer API to verify a proxy contract's implementation.
 * Logging is printed, and verification errors must be handled by the operator.
 * @param url the API endpoint that will handle the verification request
 * @param proxy the details of the proxy contract being verified
 * @param implementation the details of the implementation contract being verified
 */
export const handleLinkProxyRequest = async (
  url: string,
  proxy: NameAndAddress,
  implementation: NameAndAddress | undefined
): Promise<void> => {
  if (!implementation) {
    console.warn(
      `Implementation not found for ${proxy.name}. Skipping verification.`
    );
    return;
  }

  console.log(
    `Verifying proxy ${proxy.name} (${proxy.address}) with implementation ${implementation.address}.`
  );

  const options = generateVerifyRequest(
    url,
    proxy.address,
    implementation.address
  );
  const {
    data: {message, result},
  } = await axios(options);

  if (message === 'NOTOK') {
    console.warn(`Verification failed. Reason: ${result}`);
  } else {
    console.log(`Verification request sent.`);
    console.log(`To check the request status, use ${result} as GUID.`);
  }
};

// See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md#list-of-chain-ids
export const builtinChains = [
  {
    network: 'mainnet',
    chainId: 1,
    urls: {
      apiURL: 'https://api.etherscan.io/api',
      browserURL: 'https://etherscan.io',
    },
  },
  {
    network: 'goerli',
    chainId: 5,
    urls: {
      apiURL: 'https://api-goerli.etherscan.io/api',
      browserURL: 'https://goerli.etherscan.io',
    },
  },
  {
    network: 'optimisticEthereum',
    chainId: 10,
    urls: {
      apiURL: 'https://api-optimistic.etherscan.io/api',
      browserURL: 'https://optimistic.etherscan.io/',
    },
  },
  {
    network: 'bsc',
    chainId: 56,
    urls: {
      apiURL: 'https://api.bscscan.com/api',
      browserURL: 'https://bscscan.com',
    },
  },
  {
    network: 'sokol',
    chainId: 77,
    urls: {
      apiURL: 'https://blockscout.com/poa/sokol/api',
      browserURL: 'https://blockscout.com/poa/sokol',
    },
  },
  {
    network: 'bscTestnet',
    chainId: 97,
    urls: {
      apiURL: 'https://api-testnet.bscscan.com/api',
      browserURL: 'https://testnet.bscscan.com',
    },
  },
  {
    network: 'xdai',
    chainId: 100,
    urls: {
      apiURL: 'https://api.gnosisscan.io/api',
      browserURL: 'https://gnosisscan.io',
    },
  },
  {
    network: 'gnosis',
    chainId: 100,
    urls: {
      apiURL: 'https://api.gnosisscan.io/api',
      browserURL: 'https://gnosisscan.io',
    },
  },
  {
    network: 'heco',
    chainId: 128,
    urls: {
      apiURL: 'https://api.hecoinfo.com/api',
      browserURL: 'https://hecoinfo.com',
    },
  },
  {
    network: 'polygon',
    chainId: 137,
    urls: {
      apiURL: 'https://api.polygonscan.com/api',
      browserURL: 'https://polygonscan.com',
    },
  },
  {
    network: 'opera',
    chainId: 250,
    urls: {
      apiURL: 'https://api.ftmscan.com/api',
      browserURL: 'https://ftmscan.com',
    },
  },
  {
    network: 'hecoTestnet',
    chainId: 256,
    urls: {
      apiURL: 'https://api-testnet.hecoinfo.com/api',
      browserURL: 'https://testnet.hecoinfo.com',
    },
  },
  {
    network: 'optimisticGoerli',
    chainId: 420,
    urls: {
      apiURL: 'https://api-goerli-optimism.etherscan.io/api',
      browserURL: 'https://goerli-optimism.etherscan.io/',
    },
  },
  {
    network: 'moonbeam',
    chainId: 1284,
    urls: {
      apiURL: 'https://api-moonbeam.moonscan.io/api',
      browserURL: 'https://moonbeam.moonscan.io',
    },
  },
  {
    network: 'moonriver',
    chainId: 1285,
    urls: {
      apiURL: 'https://api-moonriver.moonscan.io/api',
      browserURL: 'https://moonriver.moonscan.io',
    },
  },
  {
    network: 'moonbaseAlpha',
    chainId: 1287,
    urls: {
      apiURL: 'https://api-moonbase.moonscan.io/api',
      browserURL: 'https://moonbase.moonscan.io/',
    },
  },
  {
    network: 'ftmTestnet',
    chainId: 4002,
    urls: {
      apiURL: 'https://api-testnet.ftmscan.com/api',
      browserURL: 'https://testnet.ftmscan.com',
    },
  },
  {
    network: 'chiado',
    chainId: 10200,
    urls: {
      apiURL: 'https://blockscout.chiadochain.net/api',
      browserURL: 'https://blockscout.chiadochain.net',
    },
  },
  {
    network: 'arbitrumOne',
    chainId: 42161,
    urls: {
      apiURL: 'https://api.arbiscan.io/api',
      browserURL: 'https://arbiscan.io/',
    },
  },
  {
    network: 'avalancheFujiTestnet',
    chainId: 43113,
    urls: {
      apiURL: 'https://api-testnet.snowtrace.io/api',
      browserURL: 'https://testnet.snowtrace.io/',
    },
  },
  {
    network: 'avalanche',
    chainId: 43114,
    urls: {
      apiURL: 'https://api.snowtrace.io/api',
      browserURL: 'https://snowtrace.io/',
    },
  },
  {
    network: 'polygonMumbai',
    chainId: 80001,
    urls: {
      apiURL: 'https://api-testnet.polygonscan.com/api',
      browserURL: 'https://mumbai.polygonscan.com/',
    },
  },
  {
    network: 'baseGoerli',
    chainId: 84531,
    urls: {
      apiURL: 'https://api-goerli.basescan.org/api',
      browserURL: 'https://goerli.basescan.org/',
    },
  },
  {
    network: 'arbitrumTestnet',
    chainId: 421611,
    urls: {
      apiURL: 'https://api-testnet.arbiscan.io/api',
      browserURL: 'https://testnet.arbiscan.io/',
    },
  },
  {
    network: 'arbitrumGoerli',
    chainId: 421613,
    urls: {
      apiURL: 'https://api-goerli.arbiscan.io/api',
      browserURL: 'https://goerli.arbiscan.io/',
    },
  },
  {
    network: 'sepolia',
    chainId: 11155111,
    urls: {
      apiURL: 'https://api-sepolia.etherscan.io/api',
      browserURL: 'https://sepolia.etherscan.io',
    },
  },
  {
    network: 'aurora',
    chainId: 1313161554,
    urls: {
      apiURL: 'https://explorer.mainnet.aurora.dev/api',
      browserURL: 'https://explorer.mainnet.aurora.dev',
    },
  },
  {
    network: 'auroraTestnet',
    chainId: 1313161555,
    urls: {
      apiURL: 'https://explorer.testnet.aurora.dev/api',
      browserURL: 'https://explorer.testnet.aurora.dev',
    },
  },
  {
    network: 'harmony',
    chainId: 1666600000,
    urls: {
      apiURL: 'https://ctrver.t.hmny.io/verify',
      browserURL: 'https://explorer.harmony.one',
    },
  },
  {
    network: 'harmonyTest',
    chainId: 1666700000,
    urls: {
      apiURL: 'https://ctrver.t.hmny.io/verify?network=testnet',
      browserURL: 'https://explorer.pops.one',
    },
  },
];
