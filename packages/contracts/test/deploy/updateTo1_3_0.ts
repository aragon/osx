import {expect} from 'chai';

import {deployments} from 'hardhat';
import {
  ForkOsxVersion,
  initForkForOsxVersion,
  initializeDeploymentFixture,
} from '../test-utils/fixture';
import {activeContractsList as v1_2_0_activeContracts} from '@aragon/osx-ethers-v1.2.0';

const enableTest = process.env.TEST_UPDATE_DEPLOY_SCRIPT !== undefined;
const network = 'mainnet';

if (enableTest) {
  describe('update/to_v1.3.0', function () {
    before(async () => {
      const previousOsxVersion: ForkOsxVersion = {
        version: 'v1.0.1',
        activeContracts: v1_2_0_activeContracts,
        forkBlockNumber: 16722881,
      };

      await initForkForOsxVersion(network, previousOsxVersion);

      const updateDeployTags = ['v1.3.0'];
      await initializeDeploymentFixture(updateDeployTags);
    });

    it('deploys new contracts with new addresses', async function () {
      const changedContracts = [
        'DAOFactory',
        'PluginRepoFactory',
        'MultisigSetup',
        'TokenVotingSetup',
        'AddresslistVotingSetup',
      ];

      const allDeployments = await deployments.all();

      changedContracts.forEach((contractName: string) => {
        const previous = (v1_2_0_activeContracts as any)[network][contractName];
        const current = allDeployments[contractName].address;

        expect(previous).to.not.be.empty;
        expect(current).to.not.be.empty;
        expect(current).to.not.eq(previous);
      });
    });
  });
}
