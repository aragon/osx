import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {MajorityVotingMock, DAO} from '../../typechain';
import {VOTING_EVENTS} from '../../utils/event';
import {
  VotingSettings,
  VotingMode,
  pct16,
  ONE_HOUR,
  ONE_YEAR,
} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';

describe('MajorityVotingMock', function () {
  let signers: SignerWithAddress[];
  let votingBase: MajorityVotingMock;
  let dao: DAO;
  let ownerAddress: string;
  let votingSettings: VotingSettings;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);
  });

  beforeEach(async () => {
    votingSettings = {
      votingMode: VotingMode.EarlyExecution,
      supportThreshold: pct16(50),
      minParticipation: pct16(20),
      minDuration: ONE_HOUR,
      minProposerVotingPower: 0,
    };

    const MajorityVotingBase = await ethers.getContractFactory(
      'MajorityVotingMock'
    );
    votingBase = await MajorityVotingBase.deploy();
    dao.grant(
      votingBase.address,
      ownerAddress,
      ethers.utils.id('UPDATE_VOTING_SETTINGS_PERMISSION')
    );
  });

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await votingBase.initializeMock(dao.address, votingSettings);

      await expect(
        votingBase.initializeMock(dao.address, votingSettings)
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('validateAndSetSettings: ', async () => {
    beforeEach(async () => {
      await votingBase.initializeMock(dao.address, votingSettings);
    });
    it('reverts if the support threshold specified exceeds 100%', async () => {
      votingSettings.supportThreshold = pct16(1000);
      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.be.revertedWithCustomError(votingBase, 'PercentageExceeds100')
        .withArgs(pct16(100), votingSettings.supportThreshold);
    });

    it('reverts if the participation threshold specified exceeds 100%', async () => {
      votingSettings.minParticipation = pct16(1000);

      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.be.revertedWithCustomError(votingBase, 'PercentageExceeds100')
        .withArgs(pct16(100), votingSettings.minParticipation);
    });

    it('reverts if the minimal duration is shorter than one hour', async () => {
      votingSettings.minDuration = ONE_HOUR - 1;
      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.be.revertedWithCustomError(votingBase, 'MinDurationOutOfBounds')
        .withArgs(ONE_HOUR, votingSettings.minDuration);
    });

    it('reverts if the minimal duration is longer than one year', async () => {
      votingSettings.minDuration = ONE_YEAR + 1;
      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.be.revertedWithCustomError(votingBase, 'MinDurationOutOfBounds')
        .withArgs(ONE_YEAR, votingSettings.minDuration);
    });

    it('should change the voting settings successfully', async () => {
      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.emit(votingBase, VOTING_EVENTS.VOTING_SETTINGS_UPDATED)
        .withArgs(
          votingSettings.votingMode,
          votingSettings.supportThreshold,
          votingSettings.minParticipation,
          votingSettings.minDuration,
          votingSettings.minProposerVotingPower
        );
    });
  });
});
