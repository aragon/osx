import {
  getNetworkNameByAlias,
  getDaoEnsDomain,
  getPluginEnsDomain
} from '@aragon/osx-commons-configs';
import {ethers} from 'ethers';

function getDaoDomain(networkName: string): string{
  if (networkName === 'clauSepolia') {
    return 'claudia.eth';
  }

  const network = getNetworkNameByAlias(networkName);
  if (network === null) {
    return '';
  }

  return getDaoEnsDomain(network) ?? '';
}

function getPluginDomain(networkName: string): string{
  if (networkName === 'clauSepolia') {
    return 'plugin.claudia.eth';
  }

  const network = getNetworkNameByAlias(networkName);
  if (network === null) {
    return '';
  }

  return getPluginEnsDomain(network) ?? '';
}

function getDomainHash(domain: string): string{
  // todo
  return ethers.utils.namehash(domain);
}

function getEnsRegistry(networkName: string): string{

   const ensRegistryAddresses: {[key: string]: string} = {
    mainnet: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    goerli: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    sepolia: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    clauSepolia: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    holesky: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',

  };

  if (!(networkName in ensRegistryAddresses)) {
    return '';
  }

  return ensRegistryAddresses[networkName];
}

function  getEnsResolver(networkName: string): string{
  const ensPublicResolvers: {[key: string]: string} = {
    goerli: '0x19c2d5d0f035563344dbb7be5fd09c8dad62b001',
    mainnet: '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41',
    sepolia: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
    clauSepolia: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
    holesky: '0x9010A27463717360cAD99CEA8bD39b8705CCA238',
  };

  if (!(networkName in ensPublicResolvers)) {
    return '';
  } 

  return ensPublicResolvers[networkName];
}

function getDomainNameReversed(domain: string): string {
  // Register subdomains in the reverse order
  let domainNamesReversed = domain.split('.');
  domainNamesReversed.push(''); //add the root domain
  domainNamesReversed = domainNamesReversed.reverse();

  const domainSubdomains = [];
  for (let i = 0; i < domainNamesReversed.length - 1; i++) {
    // to support subdomains
    const domain = domainNamesReversed
      .map((value, index) => (index <= i ? value : ''))
      .filter(value => value !== '')
      .reverse()
      .join('.');
    domainSubdomains.push(domain);
  }

  return ethers.utils.defaultAbiCoder.encode(['string[]', 'string[]'], [domainNamesReversed, domainSubdomains]);
}

function main(){
  const functions: { [key: string]: (networkName: string) => string } = {
    'getDaoDomain': getDaoDomain,
    'getPluginDomain': getPluginDomain,
    'getEnsRegistry': getEnsRegistry,
    'getEnsResolver': getEnsResolver,
    'getDomainHash': getDomainHash,
    'getDomainNameReversed': getDomainNameReversed
  };

const functionName = process.argv[2];
const networkName = process.argv[3];


// Check if the operation exists in our function map
if (functionName in functions) {
  const result = functions[functionName](networkName);
  console.log(result);
} else {
    throw new Error(`Unknown function: ${functionName}`);
  }
}

main();
