import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {MajorityVotingMock, DAO} from '../../typechain';
import {VOTING_EVENTS} from '../../utils/event';
import {pct16} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';

describe('MajorityVotingMock', function () {
  let signers: SignerWithAddress[];
  let votingBase: MajorityVotingMock;
  let dao: DAO;
  let ownerAddress: string;

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

  function initializeMock(
    participationThreshold: any,
    supportThreshold: any,
    minDuration: any
  ) {
    return votingBase.initializeMock(
      dao.address,
      participationThreshold,
      supportThreshold,
      minDuration
    );
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await initializeMock(1, 2, 3);

      await expect(initializeMock(1, 2, 3)).to.be.revertedWith(
        ERRORS.ALREADY_INITIALIZED
      );
    });

    it('reverts if min duration is 0', async () => {
      await expect(initializeMock(1, 2, 0)).to.be.revertedWith(
        customError('VoteDurationZero')
      );
    });
  });

  describe('changeVoteConfig: ', async () => {
    beforeEach(async () => {
      await initializeMock(1, 2, 3);
    });
    it('reverts if settings are invalid', async () => {
      await expect(
        votingBase.changeVoteSettings(1, pct16(1000), 3)
      ).to.be.revertedWith(
        customError('PercentageExceeds100', pct16(100), pct16(1000))
      );

      await expect(
        votingBase.changeVoteSettings(pct16(1000), 2, 3)
      ).to.be.revertedWith(
        customError('PercentageExceeds100', pct16(100), pct16(1000))
      );

      await expect(votingBase.changeVoteSettings(1, 2, 0)).to.be.revertedWith(
        customError('VoteDurationZero')
      );
    });

    it('should change the settings successfully', async () => {
      expect(await votingBase.changeVoteSettings(2, 4, 8))
        .to.emit(votingBase, VOTING_EVENTS.VOTE_SETTINGS_UPDATED)
        .withArgs(2, 4, 8);
    });
  });
});
