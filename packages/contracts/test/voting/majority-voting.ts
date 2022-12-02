import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {MajorityVotingMock, DAOMock} from '../../typechain';
import {VOTING_EVENTS, pct16} from '../test-utils/voting';
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

    votingBase = await deployWithProxy(MajorityVotingBase) as MajorityVotingMock;
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

  describe('setConfiguration: ', async () => {
    beforeEach(async () => {
      await initializeMock(1, 2, 3);
    });
    it('reverts if wrong config is set', async () => {
      await expect(
        votingBase.setConfiguration(1, pct16(1000), 3)
      ).to.be.revertedWith(
        customError('VoteSupportExceeded', pct16(100), pct16(1000))
      );

      await expect(
        votingBase.setConfiguration(pct16(1000), 2, 3)
      ).to.be.revertedWith(
        customError('VoteParticipationExceeded', pct16(100), pct16(1000))
      );

      await expect(votingBase.setConfiguration(1, 2, 0)).to.be.revertedWith(
        customError('VoteDurationZero')
      );
    });

    it('should change config successfully', async () => {
      expect(await votingBase.setConfiguration(2, 4, 8))
        .to.emit(votingBase, VOTING_EVENTS.CONFIG_UPDATED)
        .withArgs(2, 4, 8);
    });
  });
});
