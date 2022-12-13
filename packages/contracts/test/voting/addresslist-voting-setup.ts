import {expect} from 'chai';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {AddresslistVotingSetup} from '../../typechain';
import {deployNewDAO} from '../test-utils/dao';
import {getInterfaceID} from '../test-utils/interfaces';
import {VoteSettings, pct16, ONE_HOUR} from '../test-utils/voting';

enum Op {
  Grant,
  Revoke,
  Freeze,
  GrantWithOracle,
}

let defaultData: any;
let voteSettings: VoteSettings;
let voteSettingsDefault: [
  boolean,
  boolean,
  BigNumber,
  BigNumber,
  number,
  number
];
let members: string[];

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;
const EMPTY_DATA = '0x';

const prepareInstallationDataTypes = [
  'tuple(bool,bool,uint64,uint64,uint64,uint256)',
  'address[]',
];

// Permissions
const MODIFY_ADDRESSLIST_PERMISSION_ID = ethers.utils.id(
  'MODIFY_ADDRESSLIST_PERMISSION'
);
const CHANGE_VOTE_SETTINGS_PERMISSION_ID = ethers.utils.id(
  'CHANGE_VOTE_SETTINGS_PERMISSION'
);
const UPGRADE_PERMISSION_ID = ethers.utils.id('UPGRADE_PLUGIN_PERMISSION');
const EXECUTE_PERMISSION_ID = ethers.utils.id('EXECUTE_PERMISSION');

describe('AddresslistVotingSetup', function () {
  let signers: SignerWithAddress[];
  let addresslistVotingSetup: AddresslistVotingSetup;
  let implementationAddress: string;
  let targetDao: any;

  before(async () => {
    voteSettings = {
      earlyExecution: true,
      voteReplacement: false,
      supportThreshold: pct16(50),
      minParticipation: pct16(20),
      minDuration: ONE_HOUR,
      minProposerVotingPower: 0,
    };

    signers = await ethers.getSigners();
    targetDao = await deployNewDAO(signers[0].address);
    members = [signers[0].address];

    const AddresslistVotingSetup = await ethers.getContractFactory(
      'AddresslistVotingSetup'
    );
    addresslistVotingSetup = await AddresslistVotingSetup.deploy();

    implementationAddress =
      await addresslistVotingSetup.getImplementationAddress();

    voteSettingsDefault = [true, false, pct16(50), pct16(20), 3600, 0];

    defaultData = abiCoder.encode(prepareInstallationDataTypes, [
      voteSettingsDefault,
      [],
    ]);
  });

  it('creates addresslist voting base with the correct interface', async () => {
    const factory = await ethers.getContractFactory('AddresslistVoting');
    const addresslistVotingContract = factory.attach(implementationAddress);

    const iface = new ethers.utils.Interface([
      'function addAddresses(address[])',
      'function removeAddresses(address[])',
      'function isListed(address,uint256) returns (bool)',
      'function addresslistLength(uint256) returns (uint256)',
      'function initialize(address,(bool,bool,uint64,uint64,uint64,uint256),address[])',
    ]);

    expect(
      await addresslistVotingContract.supportsInterface(getInterfaceID(iface))
    ).to.be.eq(true);
  });

  describe('prepareInstallation', async () => {
    it('correctly returns prepare installation data abi', async () => {
      // Human-Readable Abi of data param of `prepareInstallation`.
      const dataHRABI =
        '(tuple(bool, bool, uint64, uint64, uint64, uint256) voteSettings, address[] members)';

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
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          MODIFY_ADDRESSLIST_PERMISSION_ID,
        ],
        [
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          CHANGE_VOTE_SETTINGS_PERMISSION_ID,
        ],
        [
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Op.Grant,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
      ]);
    });

    it('correctly sets up the plugin', async () => {
      const data = abiCoder.encode(prepareInstallationDataTypes, [
        voteSettingsDefault,
        members,
      ]);

      const nonce = await ethers.provider.getTransactionCount(
        addresslistVotingSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: addresslistVotingSetup.address,
        nonce,
      });

      await addresslistVotingSetup.prepareInstallation(targetDao.address, data);

      const factory = await ethers.getContractFactory('AddresslistVoting');
      const addresslistVotingContract = factory.attach(
        anticipatedPluginAddress
      );
      const latestBlock = await ethers.provider.getBlock('latest');

      expect(await addresslistVotingContract.getDAO()).to.be.equal(
        targetDao.address
      );
      expect(await addresslistVotingContract.minParticipation()).to.be.equal(
        voteSettings.minParticipation
      );
      expect(await addresslistVotingContract.supportThreshold()).to.be.equal(
        voteSettings.supportThreshold
      );
      expect(await addresslistVotingContract.minDuration()).to.be.equal(
        voteSettings.minDuration
      );
      expect(
        await addresslistVotingContract.minProposerVotingPower()
      ).to.be.equal(voteSettings.minProposerVotingPower);

      await ethers.provider.send('evm_mine', []);

      expect(
        await addresslistVotingContract.addresslistLength(latestBlock.number)
      ).to.be.equal(members.length);
      expect(
        await addresslistVotingContract.isListed(members[0], latestBlock.number)
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
          Op.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          MODIFY_ADDRESSLIST_PERMISSION_ID,
        ],
        [
          Op.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          CHANGE_VOTE_SETTINGS_PERMISSION_ID,
        ],
        [
          Op.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Op.Revoke,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
      ]);
    });
  });
});
