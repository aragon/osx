import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {MajorityVotingMock, DAO} from '../../typechain';
import {VOTING_EVENTS} from '../../utils/event';

import {pct16, VoteSettings, ONE_HOUR, ONE_YEAR} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';

describe('MajorityVotingMock', function () {
  let signers: SignerWithAddress[];
  let votingBase: MajorityVotingMock;
  let dao: DAO;
  let ownerAddress: string;
  let voteSettings: VoteSettings;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);
  });

  beforeEach(async () => {
    voteSettings = {
      earlyExecution: true,
      voteReplacement: false,
      supportThreshold: pct16(50),
      minParticipation: pct16(20),
      minDuration: 3600,
      minProposerVotingPower: 0,
    };

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
      await votingBase.initializeMock(dao.address, voteSettings);

      await expect(
        votingBase.initializeMock(dao.address, voteSettings)
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('validateAndSetSettings: ', async () => {
    beforeEach(async () => {
      await votingBase.initializeMock(dao.address, voteSettings);
    });
    it('reverts if the support threshold specified exceeds 100%', async () => {
      voteSettings.supportThreshold = pct16(1000);
      await expect(
        votingBase.changeVoteSettings(voteSettings)
      ).to.be.revertedWith(
        customError(
          'PercentageExceeds100',
          pct16(100),
          voteSettings.supportThreshold
        )
      );
    });

    it('reverts if the participation threshold specified exceeds 100%', async () => {
      voteSettings.minParticipation = pct16(1000);
      await expect(
        votingBase.changeVoteSettings(voteSettings)
      ).to.be.revertedWith(
        customError(
          'PercentageExceeds100',
          pct16(100),
          voteSettings.minParticipation
        )
      );
    });

    it('reverts if the minimal duration is shorter than one hour', async () => {
      voteSettings.minDuration = ONE_HOUR - 1;
      await expect(
        votingBase.changeVoteSettings(voteSettings)
      ).to.be.revertedWith(
        customError(
          'MinDurationOutOfBounds',
          ONE_HOUR,
          voteSettings.minDuration
        )
      );
    });

    it('reverts if the minimal duration is longer than one year', async () => {
      voteSettings.minDuration = ONE_YEAR + 1;
      await expect(
        votingBase.changeVoteSettings(voteSettings)
      ).to.be.revertedWith(
        customError(
          'MinDurationOutOfBounds',
          ONE_YEAR,
          voteSettings.minDuration
        )
      );
    });

    it('reverts if early execution and vote replacement are both true', async () => {
      voteSettings.voteReplacement = true;
      await expect(
        votingBase.changeVoteSettings(voteSettings)
      ).to.be.revertedWith(
        customError('EarlyExecutionAndVoteReplacementNotAllowed')
      );
    });

    it('should change the vote settings successfully', async () => {
      expect(await votingBase.changeVoteSettings(voteSettings))
        .to.emit(votingBase, VOTING_EVENTS.VOTE_SETTINGS_UPDATED)
        .withArgs(
          voteSettings.earlyExecution,
          voteSettings.voteReplacement,
          voteSettings.supportThreshold,
          voteSettings.minParticipation,
          voteSettings.minDuration,
          voteSettings.minProposerVotingPower
        );
    });
  });
});
