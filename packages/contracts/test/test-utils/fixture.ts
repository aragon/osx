import {getNetworkByNameOrAlias} from '@aragon/osx-commons-configs';
import hre, {network, deployments} from 'hardhat';

export interface ForkOsxVersion {
  version: string;
  activeContracts: any;
  forkBlockNumber: number;
}

export async function initializeFork(
  forkNetwork: string,
  blockNumber: number
): Promise<void> {
  const networkSettings = getNetworkByNameOrAlias(forkNetwork);

  if (networkSettings === null) {
    throw new Error(`No info found for network '${forkNetwork}'.`);
  }

  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: networkSettings.url,
          blockNumber: blockNumber,
        },
      },
    ],
  });
}

export async function initializeDeploymentFixture(tag: string | string[]) {
  const fixture = deployments.createFixture(async () => {
    await deployments.fixture(tag); // ensure you start from a fresh deployments
  });

  await fixture();
}

export async function initForkForOsxVersion(
  forkNetwork: string,
  osxVersion: ForkOsxVersion
): Promise<void> {
  // Aggregate necessary information to HardhatEnvironment.
  hre.testingFork = {
    network: forkNetwork,
    osxVersion: osxVersion.version,
    activeContracts: osxVersion.activeContracts,
  };

  // Initialize a fork.
  await initializeFork(forkNetwork, osxVersion.forkBlockNumber);
}
