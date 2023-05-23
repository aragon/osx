import {expect} from 'chai';

import {deployments} from 'hardhat';
import {initForkAndFixture} from '../test-utils/fixture';

async function forkAndUpdate() {
  await initForkAndFixture('mainnet', 'v1.2.0');
}

describe('update/to_v1.2.0', function () {
  before(async () => {
    // deployment should be empty
    expect(await deployments.all()).to.be.empty;

    await forkAndUpdate();
  });

  it('should have deployments', async function () {
    expect(await deployments.all()).to.not.be.empty;
  });
});
