import {
  MajorityVotingMock,
  DAO,
  IERC165Upgradeable__factory,
  IPlugin__factory,
  IProposal__factory,
  IMajorityVoting__factory,
  DAO__factory,
  MajorityVotingMock__factory,
  IProtocolVersion__factory,
} from '../../../../typechain';
import {VotingSettings, VotingMode} from './voting-helpers';
import {TIME} from '@aragon/osx-commons-sdk/src/constants';
import {getInterfaceId} from '@aragon/osx-commons-sdk/src/interfaces';
import {pctToRatio} from '@aragon/osx-commons-sdk/src/math';
import {deployWithProxy} from '@aragon/osx-commons/utils/proxy';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ethers} from 'hardhat';

export const MAJORITY_VOTING_BASE_INTERFACE = new ethers.utils.Interface([
  'function minDuration()',
  'function minProposerVotingPower()',
  'function votingMode()',
  'function totalVotingPower(uint256)',
  'function getProposal(uint256)',
  'function updateVotingSettings(tuple(uint8,uint32,uint32,uint64,uint256))',
  'function createProposal(bytes,tuple(address,uint256,bytes)[],uint256,uint64,uint64,uint8,bool)',
]);

describe('MajorityVotingMock', function () {
  let signers: SignerWithAddress[];
  let votingBase: MajorityVotingMock;
  let dao: DAO;
  let ownerAddress: string;
  let votingSettings: VotingSettings;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    dao = await deployWithProxy<DAO>(new DAO__factory(signers[0]));
    await dao.initialize(
      [],
      ownerAddress,
      ethers.constants.AddressZero,
      'examplURI'
    );
  });

  beforeEach(async () => {
    votingSettings = {
      votingMode: VotingMode.EarlyExecution,
      supportThreshold: pctToRatio(50),
      minParticipation: pctToRatio(20),
      minDuration: TIME.HOUR,
      minProposerVotingPower: 0,
    };

    const MajorityVotingMock = new MajorityVotingMock__factory(signers[0]);

    votingBase = await deployWithProxy<MajorityVotingMock>(MajorityVotingMock);
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
      ).to.be.revertedWith('Initializable: contract is already initialized');
    });
  });

  describe('ERC-165', async () => {
    it('does not support the empty interface', async () => {
      expect(await votingBase.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await votingBase.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IPlugin` interface', async () => {
      const iface = IPlugin__factory.createInterface();
      expect(await votingBase.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IProtocolVersion` interface', async () => {
      const iface = IProtocolVersion__factory.createInterface();
      expect(await votingBase.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IProposal` interface', async () => {
      const iface = IProposal__factory.createInterface();
      expect(await votingBase.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IMajorityVoting` interface', async () => {
      const iface = IMajorityVoting__factory.createInterface();
      expect(await votingBase.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `MajorityVotingBase` interface', async () => {
      expect(
        await votingBase.supportsInterface(
          getInterfaceId(MAJORITY_VOTING_BASE_INTERFACE)
        )
      ).to.be.true;
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
      votingSettings.minDuration = TIME.HOUR - 1;
      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.be.revertedWithCustomError(votingBase, 'MinDurationOutOfBounds')
        .withArgs(TIME.HOUR, votingSettings.minDuration);
    });

    it('reverts if the minimal duration is longer than one year', async () => {
      votingSettings.minDuration = TIME.YEAR + 1;
      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.be.revertedWithCustomError(votingBase, 'MinDurationOutOfBounds')
        .withArgs(TIME.YEAR, votingSettings.minDuration);
    });

    it('should change the voting settings successfully', async () => {
      await expect(votingBase.updateVotingSettings(votingSettings))
        .to.emit(votingBase, 'VotingSettingsUpdated')
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
        .to.emit(votingBase, 'VotingSettingsUpdated')
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
