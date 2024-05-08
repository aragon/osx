import hre from 'hardhat';

export function skipTestIf(condition: boolean) {
  return condition ? it : it.skip;
}

export function skipTestIfNetworks(networksToSkip: string[]) {
  return skipTestIf(!networksToSkip.includes(hre.network.name));
}

const skipTestIfNetworkIsZkSync = skipTestIfNetworks([
  'zkSync',
  'zkLocalTestnet',
  'zkTestnet',
]);
