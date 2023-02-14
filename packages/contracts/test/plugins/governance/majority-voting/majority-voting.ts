import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {MajorityVotingMock, DAO} from '../../../../typechain';
import {VOTING_EVENTS} from '../../../../utils/event';
import {
  VotingSettings,
  VotingMode,
  pctToRatio,
  ONE_HOUR,
  ONE_YEAR,
} from '../../../test-utils/voting';
import {deployWithProxy} from '../../../test-utils/proxy';
import {OZ_ERRORS} from '../../../test-utils/error';
import {daoExampleURI} from '../../../test-utils/dao';
import {getInterfaceID} from '../../../test-utils/interfaces';

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
    dao = await deployWithProxy(DAO);
    await dao.initialize(
      '0x',
      ownerAddress,
      ethers.constants.AddressZero,
      daoExampleURI
    );
  });

  beforeEach(async () => {
    votingSettings = {
      votingMode: VotingMode.EarlyExecution,
      supportThreshold: pctToRatio(50),
      minParticipation: pctToRatio(20),
      minDuration: ONE_HOUR,
      minProposerVotingPower: 0,
    };

    const MajorityVotingBase = await ethers.getContractFactory(
      'MajorityVotingMock'
    );
    votingBase = await MajorityVotingBase.deploy();
    await dao.grant(
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
      ).to.be.revertedWith(OZ_ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('plugin interface: ', async () => {
    it('does not support the empty interface', async () => {
      expect(await votingBase.supportsInterface('0x00000000')).to.be.eq(false);
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      // @ts-ignore
      const IERC165Upgradeable = await hre.artifacts.readArtifact(
        'IERC165Upgradeable'
      );
      const iface = new ethers.utils.Interface(IERC165Upgradeable.abi);

      expect(
        await votingBase.supportsInterface(getInterfaceID(iface))
      ).to.be.eq(true);
    });

    it('supports the `IPlugin` interface', async () => {
      // @ts-ignore
      const IPlugin = await hre.artifacts.readArtifact('IPlugin');
      const iface = new ethers.utils.Interface(IPlugin.abi);

      expect(
        await votingBase.supportsInterface(getInterfaceID(iface))
      ).to.be.eq(true);
    });

    it('supports the `IProposal` interface', async () => {
      // @ts-ignore
      const IProposal = await hre.artifacts.readArtifact('IProposal');
      const iface = new ethers.utils.Interface(IProposal.abi);

      expect(
        await votingBase.supportsInterface(getInterfaceID(iface))
      ).to.be.eq(true);
    });

    it('supports the `IMajorityVoting` interface', async () => {
      // @ts-ignore
      const IMajorityVoting = await hre.artifacts.readArtifact(
        'IMajorityVoting'
      );
      const iface = new ethers.utils.Interface(IMajorityVoting.abi);

      expect(
        await votingBase.supportsInterface(getInterfaceID(iface))
      ).to.be.eq(true);
    });
  });

  describe('validateAndSetSettings: ', async () => {
    beforeEach(async () => {
      await votingBase.initializeMock(dao.address, votingSettings);
    });

    it('reverts if the support threshold specified equals 100%', async () => {
      votingSettings.supportThreshold = pctToRatio(100);
      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.be.revertedWithCustomError(votingBase, 'RatioOutOfBounds')
        .withArgs(pctToRatio(100).sub(1), votingSettings.supportThreshold);
    });

    it('reverts if the support threshold specified exceeds 100%', async () => {
      votingSettings.supportThreshold = pctToRatio(1000);
      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.be.revertedWithCustomError(votingBase, 'RatioOutOfBounds')
        .withArgs(pctToRatio(100).sub(1), votingSettings.supportThreshold);
    });

    it('accepts if the minimum participation specified equals 100%', async () => {
      votingSettings.supportThreshold = pctToRatio(1000);
      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.be.revertedWithCustomError(votingBase, 'RatioOutOfBounds')
        .withArgs(pctToRatio(100).sub(1), votingSettings.supportThreshold);
    });

    it('reverts if the minimum participation specified exceeds 100%', async () => {
      votingSettings.minParticipation = pctToRatio(1000);

      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.be.revertedWithCustomError(votingBase, 'RatioOutOfBounds')
        .withArgs(pctToRatio(100), votingSettings.minParticipation);
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
