import {expect} from 'chai';
import {ethers} from 'hardhat';

import {AdminSetup} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';
import {deployNewDAO} from '../test-utils/dao';
import {getInterfaceID} from '../test-utils/interfaces';
import {Operation} from '../core/permission/permission-manager';

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;
const EMPTY_DATA = '0x';

// Permissions
const EXECUTE_PROPOSAL_PERMISSION_ID = ethers.utils.id(
  'EXECUTE_PROPOSAL_PERMISSION'
);
const EXECUTE_PERMISSION_ID = ethers.utils.id('EXECUTE_PERMISSION');

describe('AdminSetup', function () {
  let ownerAddress: string;
  let signers: any;
  let adminSetup: AdminSetup;
  let implementationAddress: string;
  let targetDao: any;
  let minimum_data: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
    targetDao = await deployNewDAO(ownerAddress);

    minimum_data = abiCoder.encode(['address'], [ownerAddress]);

    const AdminSetup = await ethers.getContractFactory('AdminSetup');
    adminSetup = await AdminSetup.deploy();

    implementationAddress = await adminSetup.getImplementationAddress();
  });

  it('creates admin address base with the correct interface', async () => {
    const factory = await ethers.getContractFactory('Admin');
    const adminAddressContract = factory.attach(implementationAddress);

    const iface = new ethers.utils.Interface([
      'function initialize(address  _dao)',
      'function executeProposal(bytes _proposalMetadata, tuple(address,uint256,bytes)[] _actions)',
    ]);

    expect(
      await adminAddressContract.supportsInterface(getInterfaceID(iface))
    ).to.be.eq(true);
  });

  describe('prepareInstallation', async () => {
    it('correctly returns prepare installation data abi', async () => {
      // Human-Readable Abi of data param of `prepareInstallation`.
      const dataHRABI = '(address admin)';

      expect(await adminSetup.prepareInstallationDataABI()).to.be.eq(dataHRABI);
    });

    it('fails if data is empty, or not of minimum length', async () => {
      await expect(
        adminSetup.prepareInstallation(targetDao.address, EMPTY_DATA)
      ).to.be.reverted;

      await expect(
        adminSetup.prepareInstallation(
          targetDao.address,
          minimum_data.substring(0, minimum_data.length - 1)
        )
      ).to.be.reverted;
    });

    it('reverts if encoded address in `_data` is zero', async () => {
      const dataWithAddressZero = abiCoder.encode(['address'], [AddressZero]);

      await expect(
        adminSetup.prepareInstallation(targetDao.address, dataWithAddressZero)
      ).to.be.revertedWith(customError('AdminAddressInvalid', AddressZero));
    });

    it('correctly returns plugin, helpers and permissions', async () => {
      const nonce = await ethers.provider.getTransactionCount(
        adminSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: adminSetup.address,
        nonce,
      });

      const {plugin, helpers, permissions} =
        await adminSetup.callStatic.prepareInstallation(
          targetDao.address,
          minimum_data
        );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(0);
      expect(permissions.length).to.be.equal(2);
      expect(permissions).to.deep.equal([
        [
          Operation.Grant,
          plugin,
          ownerAddress,
          AddressZero,
          EXECUTE_PROPOSAL_PERMISSION_ID,
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
      const daoAddress = targetDao.address;

      const nonce = await ethers.provider.getTransactionCount(
        adminSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: adminSetup.address,
        nonce,
      });

      await adminSetup.prepareInstallation(daoAddress, minimum_data);

      const factory = await ethers.getContractFactory('Admin');
      const adminAddressContract = factory.attach(anticipatedPluginAddress);

      expect(await adminAddressContract.getDAO()).to.be.equal(daoAddress);
    });
  });

  describe('prepareUninstallation', async () => {
    it('correctly returns prepare uninstallation data abi', async () => {
      // Human-Readable Abi of data param of `prepareUninstallation`.
      const dataHRABI = '';

      expect(await adminSetup.prepareUninstallationDataABI()).to.be.eq(
        dataHRABI
      );
    });

    it('correctly returns permissions', async () => {
      const plugin = ethers.Wallet.createRandom().address;

      const permissions = await adminSetup.callStatic.prepareUninstallation(
        targetDao.address,
        plugin,
        [],
        EMPTY_DATA
      );

      expect(permissions.length).to.be.equal(1);
      expect(permissions).to.deep.equal([
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
