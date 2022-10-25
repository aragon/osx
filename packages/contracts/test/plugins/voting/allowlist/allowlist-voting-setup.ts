import {expect} from 'chai';
import {ethers} from 'hardhat';

import {AllowlistVotingSetup} from '../../../../typechain';
import {deployNewDAO} from '../../../test-utils/deploy-helpers';
import {getInterfaceID} from '../../../test-utils/interfaces';

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
const MODIFY_ALLOWLIST_PERMISSION_ID = ethers.utils.id(
  'MODIFY_ALLOWLIST_PERMISSION'
);
const SET_CONFIGURATION_PERMISSION_ID = ethers.utils.id(
  'SET_CONFIGURATION_PERMISSION'
);
const UPGRADE_PERMISSION_ID = ethers.utils.id('UPGRADE_PLUGIN_PERMISSION');
const EXECUTE_PERMISSION_ID = ethers.utils.id('EXECUTE_PERMISSION');

describe('AllowlistVotingSetup', function () {
  let ownerAddress: string;
  let signers: any;
  let allowlistVotingSetup: AllowlistVotingSetup;
  let implementationAddress: string;
  let targetDao: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
    targetDao = await deployNewDAO(ownerAddress);

    const AllowlistVotingSetup = await ethers.getContractFactory(
      'AllowlistVotingSetup'
    );
    allowlistVotingSetup = await AllowlistVotingSetup.deploy();

    implementationAddress =
      await allowlistVotingSetup.getImplementationAddress();
  });

  it('creates allowlist voting base with the correct interface', async () => {
    const factory = await ethers.getContractFactory('AllowlistVoting');
    const allowlistVotingContract = factory.attach(implementationAddress);

    const iface = new ethers.utils.Interface([
      'function addAllowedUsers(address[]  _users)',
      'function removeAllowedUsers(address[] _users)',
      'function isAllowed(address account, uint256 blockNumber) returns (bool)',
      'function allowedUserCount(uint256 blockNumber) returns (uint256)',
    ]);

    expect(
      await allowlistVotingContract.supportsInterface(getInterfaceID(iface))
    ).to.be.eq(true);
  });

  describe('prepareInstallation', async () => {
    it('correctly returns prepare installation data abi', async () => {
      // Human-Readable Abi of data param of `prepareInstallation`.
      const dataHRABI =
        '(uint64 participationRequiredPct, uint64 supportRequiredPct, uint64 minDuration, address[] allowed)';

      expect(await allowlistVotingSetup.prepareInstallationDataABI()).to.be.eq(
        dataHRABI
      );
    });

    it('fails if data is empty, or not of minimum length', async () => {
      await expect(
        allowlistVotingSetup.prepareInstallation(targetDao.address, EMPTY_DATA)
      ).to.be.reverted;

      await expect(
        allowlistVotingSetup.prepareInstallation(
          targetDao.address,
          MINIMUM_DATA.substring(0, MINIMUM_DATA.length - 1)
        )
      ).to.be.reverted;

      await expect(
        allowlistVotingSetup.prepareInstallation(
          targetDao.address,
          MINIMUM_DATA
        )
      ).not.to.be.reverted;
    });

    it('correctly returns plugin, helpers and permissions', async () => {
      const nonce = await ethers.provider.getTransactionCount(
        allowlistVotingSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: allowlistVotingSetup.address,
        nonce,
      });

      const {plugin, helpers, permissions} =
        await allowlistVotingSetup.callStatic.prepareInstallation(
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
          MODIFY_ALLOWLIST_PERMISSION_ID,
        ],
        [
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          SET_CONFIGURATION_PERMISSION_ID,
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
      const participationRequiredPct = 1;
      const supportRequiredPct = 2;
      const minDuration = 3;
      const allowed = [ownerAddress];

      const data = abiCoder.encode(
        ['uint64', 'uint64', 'uint64', 'address[]'],
        [participationRequiredPct, supportRequiredPct, minDuration, allowed]
      );

      const nonce = await ethers.provider.getTransactionCount(
        allowlistVotingSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: allowlistVotingSetup.address,
        nonce,
      });

      await allowlistVotingSetup.prepareInstallation(daoAddress, data);

      const factory = await ethers.getContractFactory('AllowlistVoting');
      const allowlistVotingContract = factory.attach(anticipatedPluginAddress);
      const latestBlock = await ethers.provider.getBlock('latest');

      expect(await allowlistVotingContract.getDAO()).to.be.equal(daoAddress);
      expect(
        await allowlistVotingContract.participationRequiredPct()
      ).to.be.equal(participationRequiredPct);
      expect(await allowlistVotingContract.supportRequiredPct()).to.be.equal(
        supportRequiredPct
      );
      expect(await allowlistVotingContract.minDuration()).to.be.equal(
        minDuration
      );

      await ethers.provider.send('evm_mine', []);

      expect(
        await allowlistVotingContract.allowedUserCount(latestBlock.number)
      ).to.be.equal(allowed.length);
      expect(
        await allowlistVotingContract.isAllowed(allowed[0], latestBlock.number)
      ).to.be.equal(true);
    });
  });

  describe('prepareUninstallation', async () => {
    it('correctly returns prepare uninstallation data abi', async () => {
      // Human-Readable Abi of data param of `prepareUninstallation`.
      const dataHRABI = '';

      expect(
        await allowlistVotingSetup.prepareUninstallationDataABI()
      ).to.be.eq(dataHRABI);
    });

    it('correctly returns permissions', async () => {
      const plugin = ethers.Wallet.createRandom().address;

      const permissions =
        await allowlistVotingSetup.callStatic.prepareUninstallation(
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
          MODIFY_ALLOWLIST_PERMISSION_ID,
        ],
        [
          Op.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          SET_CONFIGURATION_PERMISSION_ID,
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
