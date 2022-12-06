import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {MajorityVotingMock, DAOMock} from '../../typechain';
import {VOTING_EVENTS, pct16, ONE_HOUR, ONE_YEAR} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';
import {deployWithProxy} from '../test-utils/proxy';

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
    const MajorityVotingBase = await ethers.getContractFactory(
      'MajorityVotingMock'
    );

    votingBase = (await deployWithProxy(
      MajorityVotingBase
    )) as MajorityVotingMock;
  });

  function initializeMock(
    participationRequired: any,
    supportRequired: any,
    minDuration: any
  ) {
    return votingBase.initializeMock(
      daoMock.address,
      participationRequired,
      supportRequired,
      minDuration
    );
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await initializeMock(1, 2, ONE_HOUR);

      await expect(initializeMock(1, 2, ONE_HOUR)).to.be.revertedWith(
        ERRORS.ALREADY_INITIALIZED
      );
    });
  });

  describe('setConfiguration: ', async () => {
    beforeEach(async () => {
      await initializeMock(1, 2, ONE_HOUR);
    });
    it('reverts if the support threshold specified exceeds 100%', async () => {
      await expect(
        votingBase.setConfiguration(1, pct16(1000), ONE_HOUR)
      ).to.be.revertedWith(
        customError('VoteSupportExceeded', pct16(100), pct16(1000))
      );
    });

    it('reverts if the participation threshold specified exceeds 100%', async () => {
      await expect(
        votingBase.setConfiguration(pct16(1000), 2, ONE_HOUR)
      ).to.be.revertedWith(
        customError('VoteParticipationExceeded', pct16(100), pct16(1000))
      );
    });

    it('reverts if the minimal duration is out of bounds', async () => {
      await expect(
        votingBase.setConfiguration(1, 2, ONE_HOUR - 1)
      ).to.be.revertedWith(
        customError('MinDurationOutOfBounds', ONE_HOUR, ONE_HOUR - 1)
      );

      await expect(
        votingBase.setConfiguration(1, 2, ONE_YEAR + 1)
      ).to.be.revertedWith(
        customError('MinDurationOutOfBounds', ONE_YEAR, ONE_YEAR + 1)
      );
    });

    it('should change config successfully', async () => {
      expect(await votingBase.setConfiguration(2, 4, ONE_HOUR + 1))
        .to.emit(votingBase, VOTING_EVENTS.CONFIG_UPDATED)
        .withArgs(2, 4, ONE_HOUR + 1);
    });
  });
});
