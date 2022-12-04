import {expect} from 'chai';
import {ethers} from 'hardhat';

import {AddresslistVotingSetup} from '../../typechain';
import {deployNewDAO} from '../test-utils/dao';
import {getInterfaceID} from '../test-utils/interfaces';

enum Op {
  Grant,
  Revoke,
  Freeze,
  GrantWithOracle,
}

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;
const EMPTY_DATA = '0x';

// minimum bytes for `prepareInstallation` data param.
const MINIMUM_DATA = abiCoder.encode(
  ['uint64', 'uint64', 'uint64', 'address[]'],
  [1, 1, 1, []]
);

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
  let ownerAddress: string;
  let signers: any;
  let addresslistVotingSetup: AddresslistVotingSetup;
  let implementationAddress: string;
  let targetDao: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
    targetDao = await deployNewDAO(ownerAddress);

    const AddresslistVotingSetup = await ethers.getContractFactory(
      'AddresslistVotingSetup'
    );
    addresslistVotingSetup = await AddresslistVotingSetup.deploy();

    implementationAddress =
      await addresslistVotingSetup.getImplementationAddress();
  });

  it('creates addresslist voting base with the correct interface', async () => {
    const factory = await ethers.getContractFactory('AddresslistVoting');
    const addresslistVotingContract = factory.attach(implementationAddress);

    const iface = new ethers.utils.Interface([
      'function addAddresses(address[]  _voters)',
      'function removeAddresses(address[] _voters)',
      'function isListed(address account, uint256 blockNumber) returns (bool)',
      'function addresslistLength(uint256 blockNumber) returns (uint256)',
    ]);

    expect(
      await addresslistVotingContract.supportsInterface(getInterfaceID(iface))
    ).to.be.eq(true);
  });

  describe('prepareInstallation', async () => {
    it('correctly returns prepare installation data abi', async () => {
      // Human-Readable Abi of data param of `prepareInstallation`.
      const dataHRABI =
        '(uint64 totalSupportThresholdPct, uint64 relativeSupportThresholdPct, uint64 minDuration, address[] allowed)';

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
          MINIMUM_DATA.substring(0, MINIMUM_DATA.length - 1)
        )
      ).to.be.reverted;

      await expect(
        addresslistVotingSetup.prepareInstallation(
          targetDao.address,
          MINIMUM_DATA
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
          MINIMUM_DATA
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
      const daoAddress = targetDao.address;
      const totalSupportThresholdPct = 1;
      const relativeSupportThresholdPct = 2;
      const minDuration = 3;
      const allowed = [ownerAddress];

      const data = abiCoder.encode(
        ['uint64', 'uint64', 'uint64', 'address[]'],
        [
          totalSupportThresholdPct,
          relativeSupportThresholdPct,
          minDuration,
          allowed,
        ]
      );

      const nonce = await ethers.provider.getTransactionCount(
        addresslistVotingSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: addresslistVotingSetup.address,
        nonce,
      });

      await addresslistVotingSetup.prepareInstallation(daoAddress, data);

      const factory = await ethers.getContractFactory('AddresslistVoting');
      const addresslistVotingContract = factory.attach(
        anticipatedPluginAddress
      );
      const latestBlock = await ethers.provider.getBlock('latest');
        
      expect(await addresslistVotingContract.dao()).to.be.equal(daoAddress);
      expect(
        await addresslistVotingContract.totalSupportThresholdPct()
      ).to.be.equal(totalSupportThresholdPct);
      expect(
        await addresslistVotingContract.relativeSupportThresholdPct()
      ).to.be.equal(relativeSupportThresholdPct);
      expect(await addresslistVotingContract.minDuration()).to.be.equal(
        minDuration
      );

      await ethers.provider.send('evm_mine', []);

      expect(
        await addresslistVotingContract.addresslistLength(latestBlock.number)
      ).to.be.equal(allowed.length);
      expect(
        await addresslistVotingContract.isListed(allowed[0], latestBlock.number)
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
