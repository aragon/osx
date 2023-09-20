import {expect} from 'chai';

import {deployments} from 'hardhat';
import {
  ForkOsxVersion,
  initForkForOsxVersion,
  initializeDeploymentFixture,
} from '../test-utils/fixture';
import {activeContractsList as v1_3_0_rc0_2_activeContracts} from '@aragon/osx-ethers-v1.3.0-rc0.2';

const enableTest = process.env.TEST_UPDATE_DEPLOY_SCRIPT !== undefined;

export type NetworkForkData = {
  networkName: string;
  forkBlockNumber: number;
};

if (enableTest) {
  [
    // TODO: check if those are correct forkBlockNumbers
    {networkName: 'mainnet', forkBlockNumber: 16722881},
    {networkName: 'goerli', forkBlockNumber: 9225868},
    {networkName: 'polygon', forkBlockNumber: 42000000},
    {networkName: 'mumbai', forkBlockNumber: 33960187},
    {networkName: 'baseMainnet', forkBlockNumber: 2094661},
    {networkName: 'baseGoerli', forkBlockNumber: 7890908},
  ].forEach(function (networkData: NetworkForkData) {
    describe(`${networkData.networkName} update/to_v1.4.0`, function () {
      before(async () => {
        const previousOsxVersion: ForkOsxVersion = {
          version: 'v1.3.0',
          activeContracts: v1_3_0_rc0_2_activeContracts,
          forkBlockNumber: networkData.forkBlockNumber,
        };

        await initForkForOsxVersion(
          networkData.networkName,
          previousOsxVersion
        );

        const updateDeployTags = ['v1.4.0'];
        await initializeDeploymentFixture(updateDeployTags);
      });

      it('deploys new contracts with new addresses', async function () {
        const changedContracts = [
          'DAOFactory',
          // TODO: what about `managingDAOImplemenation` (note the typo in "Implemenation" )
        ];

        const allDeployments = await deployments.all();

        changedContracts.forEach((contractName: string) => {
          const previous = (v1_3_0_rc0_2_activeContracts as any)[
            networkData.networkName
          ][contractName];
          const current = allDeployments[contractName].address;

          expect(previous).to.not.be.empty;
          expect(current).to.not.be.empty;
          expect(current).to.not.eq(previous);
        });
      });
    });
  });
}
