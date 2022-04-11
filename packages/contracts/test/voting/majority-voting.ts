import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import chaiUtils from '../test-utils';
import { EVENTS, pct16 } from '../test-utils/voting';
import { customError, ERRORS } from '../test-utils/custom-error-helper';

chai.use(chaiUtils);

import { MajorityVotingMock, DAOMock } from '../../typechain';

describe('MajorityVotingMock', function () {
  let signers: SignerWithAddress[];
  let votingBase: MajorityVotingMock;
  let daoMock: DAOMock;
  let ownerAddress: string;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAOMock = await ethers.getContractFactory('DAOMock');
    daoMock = await DAOMock.deploy(ownerAddress);
  });

  beforeEach(async () => {
    const MajorityVotingBase = await ethers.getContractFactory('MajorityVotingMock');
    votingBase = await MajorityVotingBase.deploy();
  });

  function initializeMock(
    participationRequired: any,
    supportRequired: any,
    minDuration: any
  ) {
    return votingBase.initializeMock(
      daoMock.address,
      ethers.constants.AddressZero,
      participationRequired,
      supportRequired,
      minDuration
    );
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await initializeMock(1, 2, 3);

      await expect(
        initializeMock(1, 2, 3)
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
    });

    it('reverts if min duration is 0', async () => {
      await expect(
        initializeMock(1, 2, 0)
      ).to.be.revertedWith(customError('VoteDurationZero'));
    });

    it.skip('should initialize the Component it inherits from as well', async () => {
      await expect(false).to.equal(true);
      // TODO: Waffle's calledOnContractWith is not supported by Hardhat
      // await voting['initialize(address,address,uint64[3],bytes[])']
      //          (daoMock.address, erc20VoteMock.address, [1, 2, 3], [])
      // expect('initialize').to.be.calledOnContractWith(voting, [daoMock.address]);
    });
  });

  describe('changeVoteConfig: ', async () => {
    beforeEach(async () => {
      await initializeMock(1, 2, 3);
    });
    it('reverts if wrong config is set', async () => {
      await expect(
        votingBase.changeVoteConfig(1, pct16(1000), 3)
      ).to.be.revertedWith(customError('VoteSupportExceeded', pct16(100), pct16(1000)));


      await expect(
        votingBase.changeVoteConfig(pct16(1000), 2, 3)
      ).to.be.revertedWith(customError('VoteParticipationExceeded', pct16(100), pct16(1000)));


      await expect(
        votingBase.changeVoteConfig(1, 2, 0)
      ).to.be.revertedWith(customError('VoteDurationZero'));
    });

    it('should change config successfully', async () => {
      expect(await votingBase.changeVoteConfig(2, 4, 8))
        .to.emit(votingBase, EVENTS.UPDATE_CONFIG)
        .withArgs(2, 4, 8);
    });
  });
});
