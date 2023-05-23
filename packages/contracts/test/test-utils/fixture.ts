import hre, {network, deployments} from 'hardhat';

import networks from '../../networks.json';
import {UPDATE_INFOS} from '../../utils/updates';

export async function initializeFork(
  selectedNetwork: string,
  selectedUpdate: string
): Promise<void> {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: `${(networks as any)[selectedNetwork].url}`,
          blockNumber: UPDATE_INFOS[selectedUpdate].testForkBlockNumber,
        },
      },
    ],
  });
  hre.testForkingNetwork = selectedNetwork;
}

export async function initializeFixture(selectedUpdate: string) {
  await deployments.fixture(UPDATE_INFOS[selectedUpdate].tags);
}

export async function initForkAndFixture(
  selectedNetwork: string,
  selectedUpdate: string
): Promise<void> {
  await initializeFork(selectedNetwork, selectedUpdate);
  await initializeFixture(selectedUpdate);
}
