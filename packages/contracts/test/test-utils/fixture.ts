import hre, {network, deployments} from 'hardhat';

import networks from '../../networks.json';
import {UPDATE_INFOS} from '../../utils/updates';

export async function initializeFork(
  forkNetwork: string,
  blockNumber: number
): Promise<void> {
  if (!(networks as any)[forkNetwork]) {
    throw new Error(`No info found for network '${forkNetwork}'.`);
  }

  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: `${(networks as any)[forkNetwork].url}`,
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

export async function initForkAndFixture(
  forkNetwork: string,
  osxVersion: string,
  previousOsxVersion: string
): Promise<void> {
  if (!UPDATE_INFOS[osxVersion]) {
    throw new Error(`No update info found for osxVersion '${osxVersion}'.`);
  }

  hre.testingFork = {
    network: forkNetwork,
    osxVersion: previousOsxVersion,
  };

  await initializeFork(forkNetwork, UPDATE_INFOS[osxVersion].forkBlockNumber);
  await initializeDeploymentFixture(UPDATE_INFOS[osxVersion].tags);
}
