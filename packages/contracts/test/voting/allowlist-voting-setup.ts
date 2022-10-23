import {expect} from 'chai';
import {BigNumberish} from 'ethers';
import {ethers} from 'hardhat';

import {AllowlistVotingSetup, AllowlistVoting__factory} from '../../typechain';
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
const EMPTY_BYTES_32 = `0x${'00'.repeat(32)}`;

// Permissions
const MODIFY_ALLOWLIST_PERMISSION_ID = ethers.utils.id(
  'MODIFY_ALLOWLIST_PERMISSION'
);
const SET_CONFIGURATION_PERMISSION_ID = ethers.utils.id(
  'SET_CONFIGURATION_PERMISSION'
);
const UPGRADE_PERMISSION_ID = ethers.utils.id('UPGRADE_PERMISSION');
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

    it('fails if data is empty', async () => {
      await expect(
        allowlistVotingSetup.prepareInstallation(targetDao.address, EMPTY_DATA)
      ).to.be.reverted;

      await expect(
        allowlistVotingSetup.prepareInstallation(
          targetDao.address,
          EMPTY_BYTES_32
        )
      ).to.be.reverted;
    });

    it('correctly returns plugin, helpers and permissions', async () => {
      const nonce = await ethers.provider.getTransactionCount(
        allowlistVotingSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: allowlistVotingSetup.address,
        nonce,
      });

      const data = abiCoder.encode(
        ['uint64', 'uint64', 'uint64', 'address[]'],
        [1, 2, 3, [ownerAddress]]
      );

      const {plugin, helpers, permissions} =
        await allowlistVotingSetup.callStatic.prepareInstallation(
          targetDao.address,
          data
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
