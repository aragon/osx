import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {MajorityVotingMock, DAO} from '../../typechain';
import {VOTING_EVENTS} from '../../utils/event';
import {
  PluginSettings,
  VoteMode,
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
  let pluginSettings: PluginSettings;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);
  });

  beforeEach(async () => {
    pluginSettings = {
      voteMode: VoteMode.EarlyExecution,
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
      ethers.utils.id('SET_PLUGIN_SETTINGS_PERMISSION')
    );
  });

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await votingBase.initializeMock(dao.address, pluginSettings);

      await expect(
        votingBase.initializeMock(dao.address, pluginSettings)
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('validateAndSetSettings: ', async () => {
    beforeEach(async () => {
      await votingBase.initializeMock(dao.address, pluginSettings);
    });
    it('reverts if the support threshold specified exceeds 100%', async () => {
      pluginSettings.supportThreshold = pct16(1000);
      await expect(
        votingBase.updatePluginSettings(pluginSettings)
      ).to.be.revertedWith(
        customError(
          'PercentageExceeds100',
          pct16(100),
          pluginSettings.supportThreshold
        )
      );
    });

    it('reverts if the participation threshold specified exceeds 100%', async () => {
      pluginSettings.minParticipation = pct16(1000);

      await expect(
        votingBase.updatePluginSettings(pluginSettings)
      ).to.be.revertedWith(
        customError(
          'PercentageExceeds100',
          pct16(100),
          pluginSettings.minParticipation
        )
      );
    });

    it('reverts if the minimal duration is shorter than one hour', async () => {
      pluginSettings.minDuration = ONE_HOUR - 1;
      await expect(
        votingBase.updatePluginSettings(pluginSettings)
      ).to.be.revertedWith(
        customError(
          'MinDurationOutOfBounds',
          ONE_HOUR,
          pluginSettings.minDuration
        )
      );
    });

    it('reverts if the minimal duration is longer than one year', async () => {
      pluginSettings.minDuration = ONE_YEAR + 1;
      await expect(
        votingBase.updatePluginSettings(pluginSettings)
      ).to.be.revertedWith(
        customError(
          'MinDurationOutOfBounds',
          ONE_YEAR,
          pluginSettings.minDuration
        )
      );
    });

    it('should change the plugin settings successfully', async () => {
      expect(await votingBase.updatePluginSettings(pluginSettings))
        .to.emit(votingBase, VOTING_EVENTS.PLUGIN_SETTINGS_UPDATED)
        .withArgs(
          pluginSettings.voteMode,
          pluginSettings.supportThreshold,
          pluginSettings.minParticipation,
          pluginSettings.minDuration,
          pluginSettings.minProposerVotingPower
        );
    });
  });
});
