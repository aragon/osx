import {ContractFactory} from 'ethers';
import {upgrades} from 'hardhat';

type DeployOptions = {
  constructurArgs?: unknown[];
  proxyType?: 'uups';
};

// Used to deploy the implementation with the ERC1967 Proxy behind it.
// Designed this way as It might be desirable to avoid OpenZeppelin upgrades package
// later on and this way, all will be needed is to change this function.
// NOTE: To avoid lots of changes in the whole test codebase, deployWithProxy
// won't automatically call initialize and it's the caller's responsibility to do so.
export async function deployWithProxy<T>(
  contractFactory: ContractFactory,
  options: DeployOptions = {}
): Promise<T> {
  // NOTE: taking this out of this file and putting this in each test file's
  // before hook seems a good idea for efficiency, though, all test files become
  // highly dependent on this package which is undesirable for now.
  upgrades.silenceWarnings();

  return upgrades.deployProxy(contractFactory, [], {
    kind: options.proxyType || 'uups',
    initializer: false,
    unsafeAllow: ['constructor'],
    constructorArgs: options.constructurArgs || [],
  }) as unknown as Promise<T>;
}
