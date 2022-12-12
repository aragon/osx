import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {MajorityVotingMock, DAO} from '../../typechain';
import {VOTING_EVENTS} from '../../utils/event';
import {pct16, ONE_HOUR, ONE_YEAR} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';

describe('MajorityVotingMock', function () {
  let signers: SignerWithAddress[];
  let votingBase: MajorityVotingMock;
  let dao: DAO;
  let ownerAddress: string;
  const supportThreshold = pct16(50);
  const minParticipation = pct16(20);
  const minDuration = ONE_HOUR;
  const minProposerVotingPower = 0;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);
  });

  beforeEach(async () => {
    const MajorityVotingBase = await ethers.getContractFactory(
      'MajorityVotingMock'
    );
    votingBase = await MajorityVotingBase.deploy();
    dao.grant(
      votingBase.address,
      ownerAddress,
      ethers.utils.id('CHANGE_VOTE_SETTINGS_PERMISSION')
    );
  });

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await votingBase.initializeMock(
        dao.address,
        supportThreshold,
        minParticipation,
        minDuration,
        minProposerVotingPower
      );

      await expect(
        votingBase.initializeMock(
          dao.address,
          supportThreshold,
          minParticipation,
          minDuration,
          minProposerVotingPower
        )
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('changeVoteSettings: ', async () => {
    beforeEach(async () => {
      await votingBase.initializeMock(
        dao.address,
        supportThreshold,
        minParticipation,
        minDuration,
        minProposerVotingPower
      );
    });
    it('reverts if the support threshold specified exceeds 100%', async () => {
      await expect(
        votingBase.changeVoteSettings(
          supportThreshold,
          pct16(1000),
          minDuration,
          minProposerVotingPower
        )
      ).to.be.revertedWith(
        customError('PercentageExceeds100', pct16(100), pct16(1000))
      );
    });

    it('reverts if the participation threshold specified exceeds 100%', async () => {
      await expect(
        votingBase.changeVoteSettings(
          pct16(1000),
          minParticipation,
          minDuration,
          minProposerVotingPower
        )
      ).to.be.revertedWith(
        customError('PercentageExceeds100', pct16(100), pct16(1000))
      );
    });

    it('reverts if the minimal duration is out of bounds', async () => {
      await expect(
        votingBase.changeVoteSettings(
          supportThreshold,
          minParticipation,
          minDuration - 1,
          minProposerVotingPower
        )
      ).to.be.revertedWith(
        customError('MinDurationOutOfBounds', minDuration, minDuration - 1)
      );

      await expect(
        votingBase.changeVoteSettings(
          supportThreshold,
          minParticipation,
          ONE_YEAR + 1,
          minProposerVotingPower
        )
      ).to.be.revertedWith(
        customError('MinDurationOutOfBounds', ONE_YEAR, ONE_YEAR + 1)
      );
    });

    it('should change the vote settings successfully', async () => {
      expect(
        await votingBase.changeVoteSettings(
          minParticipation,
          4,
          minDuration + 1,
          minProposerVotingPower
        )
      )
        .to.emit(votingBase, VOTING_EVENTS.VOTE_SETTINGS_UPDATED)
        .withArgs(minParticipation, 4, minDuration + 1);
    });
  });
});
