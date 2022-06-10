import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import chaiUtils from '../test-utils';
import {ERRORS} from '../test-utils/custom-error-helper';

chai.use(chaiUtils);

import {TestComponent, DAOMock} from '../../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

describe('Component', function () {
  let signers: SignerWithAddress[];
  let testComponent: TestComponent;
  let daoMock: DAOMock;
  let ownerAddress: string;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAOMock = await ethers.getContractFactory('DAOMock');
    daoMock = await DAOMock.deploy(ownerAddress);
  });

  beforeEach(async () => {
    const TestComponent = await ethers.getContractFactory('TestComponent');
    testComponent = await TestComponent.deploy();

    await testComponent.initialize(daoMock.address);
  });

  describe('Initialization', async () => {
    it('reverts if trying to re-initialize', async () => {
      await expect(
        testComponent.initialize(daoMock.address)
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('Context: ', async () => {
    it('returns the right message sender', async () => {
      expect(await testComponent.msgSender()).to.be.equal(ownerAddress);
    });
  });
});
