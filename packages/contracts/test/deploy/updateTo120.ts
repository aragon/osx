import {expect} from 'chai';

import {deployments} from 'hardhat';
import {initForkAndFixture} from '../test-utils/fixture';
import {v1_0_0_active_contracts} from '@aragon/osx-versions';

async function forkAndUpdate() {
  await initForkAndFixture('mainnet', 'v1.2.0');
}

describe('update/to_v1.2.0', function () {
  before(async () => {
    await forkAndUpdate();
  });

  it('deploys new contracts with new addresses', async function () {
    const previousDAOFactory = v1_0_0_active_contracts.mainnet.DAOFactory;
    const previousMultisigSetup = v1_0_0_active_contracts.mainnet.MultisigSetup;

    const allDeployments = await deployments.all();

    expect(previousDAOFactory).to.not.be.empty;
    expect(previousMultisigSetup).to.not.be.empty;
    expect(allDeployments['DAOFactory'].address).to.not.eq(previousDAOFactory);
    expect(allDeployments['MultisigSetup'].address).to.not.eq(
      previousMultisigSetup
    );
  });
});
