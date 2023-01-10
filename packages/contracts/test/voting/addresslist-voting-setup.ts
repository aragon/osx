import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {AddresslistVotingSetup} from '../../typechain';
import {deployNewDAO} from '../test-utils/dao';
import {getInterfaceID} from '../test-utils/interfaces';
import {Operation} from '../core/permission/permission-manager';
import {
  VotingSettings,
  VotingMode,
  pct16,
  ONE_HOUR,
} from '../test-utils/voting';

let defaultData: any;
let defaultVotingSettings: VotingSettings;
let defaultMembers: string[];

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;
const EMPTY_DATA = '0x';

const prepareInstallationDataTypes = [
  'tuple(uint8,uint64,uint64,uint64,uint256)',
  'address[]',
];

// Permissions
const UPDATE_ADDRESSES_PERMISSION_ID = ethers.utils.id(
  'UPDATE_ADDRESSES_PERMISSION'
);
const UPDATE_VOTING_SETTINGS_PERMISSION_ID = ethers.utils.id(
  'UPDATE_VOTING_SETTINGS_PERMISSION'
);
const UPGRADE_PERMISSION_ID = ethers.utils.id('UPGRADE_PLUGIN_PERMISSION');
const EXECUTE_PERMISSION_ID = ethers.utils.id('EXECUTE_PERMISSION');

describe('AddresslistVotingSetup', function () {
  let signers: SignerWithAddress[];
  let addresslistVotingSetup: AddresslistVotingSetup;
  let implementationAddress: string;
  let targetDao: any;

  before(async () => {
    signers = await ethers.getSigners();
    targetDao = await deployNewDAO(signers[0].address);

    defaultVotingSettings = {
      votingMode: VotingMode.EarlyExecution,
      supportThreshold: pct16(50),
      minParticipation: pct16(20),
      minDuration: ONE_HOUR,
      minProposerVotingPower: 0,
    };
    defaultMembers = [signers[0].address];

    const AddresslistVotingSetup = await ethers.getContractFactory(
      'AddresslistVotingSetup'
    );
    addresslistVotingSetup = await AddresslistVotingSetup.deploy();

    implementationAddress =
      await addresslistVotingSetup.getImplementationAddress();

    defaultData = abiCoder.encode(prepareInstallationDataTypes, [
      Object.values(defaultVotingSettings),
      defaultMembers,
    ]);
  });

  it('creates address list voting base with the correct interface', async () => {
    const factory = await ethers.getContractFactory('AddresslistVoting');
    const addresslistVotingContract = factory.attach(implementationAddress);

    const iface = new ethers.utils.Interface([
      'function addAddresses(address[])',
      'function removeAddresses(address[])',
      'function isListed(address) returns (bool)',
      'function isListedAtBlock(address,uint256) returns (bool)',
      'function addresslistLength() returns (uint256)',
      'function addresslistLengthAtBlock(uint256) returns (uint256)',
      'function initialize(address,(uint8,uint64,uint64,uint64,uint256),address[])',
    ]);

    expect(
      await addresslistVotingContract.supportsInterface(getInterfaceID(iface))
    ).to.be.eq(true);
  });

  describe('prepareInstallation', async () => {
    it('correctly returns prepare installation data abi', async () => {
      // Human-Readable Abi of data param of `prepareInstallation`.
      const dataHRABI =
        '(tuple(uint8 votingMode, uint64 supportThreshold, uint64 minParticipation, uint64minDuration, uint256 minProposerVotingPower) votingSettings, address[] members)';

      expect(
        await addresslistVotingSetup.prepareInstallationDataABI()
      ).to.be.eq(dataHRABI);
    });

    it('fails if data is empty, or not of minimum length', async () => {
      await expect(
        addresslistVotingSetup.prepareInstallation(
          targetDao.address,
          EMPTY_DATA
        )
      ).to.be.reverted;

      await expect(
        addresslistVotingSetup.prepareInstallation(
          targetDao.address,
          defaultData.substring(0, defaultData.length - 1)
        )
      ).to.be.reverted;

      await expect(
        addresslistVotingSetup.prepareInstallation(
          targetDao.address,
          defaultData
        )
      ).not.to.be.reverted;
    });

    it('correctly returns plugin, helpers and permissions', async () => {
      const nonce = await ethers.provider.getTransactionCount(
        addresslistVotingSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: addresslistVotingSetup.address,
        nonce,
      });

      const {plugin, helpers, permissions} =
        await addresslistVotingSetup.callStatic.prepareInstallation(
          targetDao.address,
          defaultData
        );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(0);
      expect(permissions.length).to.be.equal(4);
      expect(permissions).to.deep.equal([
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPDATE_ADDRESSES_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPDATE_VOTING_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
      ]);
    });

    it('correctly sets up the plugin', async () => {
      const nonce = await ethers.provider.getTransactionCount(
        addresslistVotingSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: addresslistVotingSetup.address,
        nonce,
      });

      await addresslistVotingSetup.prepareInstallation(
        targetDao.address,
        defaultData
      );

      const factory = await ethers.getContractFactory('AddresslistVoting');
      const addresslistVotingContract = factory.attach(
        anticipatedPluginAddress
      );
      const latestBlock = await ethers.provider.getBlock('latest');
        
      expect(await addresslistVotingContract.getDAO()).to.be.equal(targetDao.address);
      expect(await addresslistVotingContract.minParticipation()).to.be.equal(
        defaultVotingSettings.minParticipation
      );
      expect(await addresslistVotingContract.supportThreshold()).to.be.equal(
        defaultVotingSettings.supportThreshold
      );
      
      expect(await addresslistVotingContract.minDuration()).to.be.equal(
        defaultVotingSettings.minDuration
      );
      expect(
        await addresslistVotingContract.minProposerVotingPower()
      ).to.be.equal(defaultVotingSettings.minProposerVotingPower);

      await ethers.provider.send('evm_mine', []);

      expect(
        await addresslistVotingContract.addresslistLengthAtBlock(
          latestBlock.number
        )
      ).to.be.equal(defaultMembers.length);
      expect(
        await addresslistVotingContract.isListedAtBlock(
          defaultMembers[0],
          latestBlock.number
        )
      ).to.be.equal(true);
    });
  });

  describe('prepareUninstallation', async () => {
    it('correctly returns prepare uninstallation data abi', async () => {
      // Human-Readable Abi of data param of `prepareUninstallation`.
      const dataHRABI = '';

      expect(
        await addresslistVotingSetup.prepareUninstallationDataABI()
      ).to.be.eq(dataHRABI);
    });

    it('correctly returns permissions', async () => {
      const plugin = ethers.Wallet.createRandom().address;

      const permissions =
        await addresslistVotingSetup.callStatic.prepareUninstallation(
          targetDao.address,
          plugin,
          [],
          EMPTY_DATA
        );

      expect(permissions.length).to.be.equal(4);
      expect(permissions).to.deep.equal([
        [
          Operation.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          UPDATE_ADDRESSES_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          UPDATE_VOTING_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
      ]);
    });
  });
});
