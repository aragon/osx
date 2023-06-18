import {expect} from 'chai';

import {deployments} from 'hardhat';
import {initForkAndFixture} from '../test-utils/fixture';
import {activeContractsList as v1_2_0_activeContracts} from 'osx-ethersV120';

const enableTest = process.env.TEST_UPDATE_DEPLOY_SCRIPT !== undefined;
const network = 'mainnet';

if (enableTest) {
  describe('update/to_v1.3.0', function () {
    before(async () => {
      await initForkAndFixture(network, 'v1_3_0', 'v1_0_0');
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
