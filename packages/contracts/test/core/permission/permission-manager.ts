import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {PermissionManagerTest, PermissionOracleMock} from '../../../typechain';
import {customError} from '../../test-utils/custom-error-helper';

const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION_ID');
const ADMIN_PERMISSION_ID = ethers.utils.id('ADMIN_PERMISSION_ID');
const UNSET_PERMISSION_ID = ethers.utils.getAddress(
  '0x0000000000000000000000000000000000000000'
);
const ALLOW_FLAG = ethers.utils.getAddress(
  '0x0000000000000000000000000000000000000002'
);

enum BulkOP {
  Grant,
  Revoke,
  Freeze,
}

interface BulkItem {
  operation: BulkOP;
  permissionID: string;
  who: string;
}

describe('Core: ACL', function () {
  let acl: PermissionManagerTest;
  let ownerSigner: SignerWithAddress;
  let otherSigner: SignerWithAddress;

  before(async () => {
    const signers = await ethers.getSigners();
    ownerSigner = signers[0];
    otherSigner = signers[1];
  });

  beforeEach(async () => {
    const ACL = await ethers.getContractFactory('PermissionManagerTest');
    acl = await ACL.deploy();
    await acl.init(ownerSigner.address);
  });

  describe('init', () => {
    it('should allow init call only once', async () => {
      await expect(acl.init(ownerSigner.address)).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });

    it('should emit Granted', async () => {
      const ACL = await ethers.getContractFactory('PermissionManagerTest');
      acl = await ACL.deploy();
      await expect(acl.init(ownerSigner.address)).to.emit(acl, 'Granted');
    });

    it('should add ROOT_PERMISSION_ID', async () => {
      const permission = await acl.getAuthPermission(
        acl.address,
        ownerSigner.address,
        ROOT_PERMISSION_ID
      );
      expect(permission).to.be.equal(ALLOW_FLAG);
    });
  });

  describe('grant', () => {
    it('should add permission', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      const permission = await acl.getAuthPermission(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID
      );
      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should emit Granted', async () => {
      await expect(
        acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.emit(acl, 'Granted');
    });

    it('should revert with already granted', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionAlreadyGranted',
          acl.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID
        )
      );
    });

    it('should revert if frozen', async () => {
      await acl.freeze(acl.address, ADMIN_PERMISSION_ID);
      await expect(
        acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError('PermissionFrozen', acl.address, ADMIN_PERMISSION_ID)
      );
    });

    it('should not allow grant', async () => {
      await expect(
        acl
          .connect(otherSigner)
          .grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should not allow for non ROOT', async () => {
      await acl.grant(acl.address, ownerSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        acl
          .connect(otherSigner)
          .grant(acl.address, otherSigner.address, ROOT_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });

  describe('grantWithOracle', () => {
    it('should add permission', async () => {
      await acl.grantWithOracle(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        ALLOW_FLAG
      );
      const permission = await acl.getAuthPermission(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID
      );
      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should emit Granted', async () => {
      await expect(
        acl.grantWithOracle(
          acl.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          ALLOW_FLAG
        )
      ).to.emit(acl, 'Granted');
    });

    it('should revert with already granted', async () => {
      await acl.grantWithOracle(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        ALLOW_FLAG
      );
      await expect(
        acl.grantWithOracle(
          acl.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          ALLOW_FLAG
        )
      ).to.be.revertedWith(
        customError(
          'PermissionAlreadyGranted',
          acl.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID
        )
      );
    });

    it('should revert if frozen', async () => {
      await acl.freeze(acl.address, ADMIN_PERMISSION_ID);
      await expect(
        acl.grantWithOracle(
          acl.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          ALLOW_FLAG
        )
      ).to.be.revertedWith(
        customError('PermissionFrozen', acl.address, ADMIN_PERMISSION_ID)
      );
    });

    it('should set PermissionOracle', async () => {
      const signers = await ethers.getSigners();
      await acl.grantWithOracle(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        signers[2].address
      );
      expect(
        await acl.getAuthPermission(
          acl.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(signers[2].address);
    });

    it('should not allow grant', async () => {
      await expect(
        acl
          .connect(otherSigner)
          .grantWithOracle(
            acl.address,
            otherSigner.address,
            ADMIN_PERMISSION_ID,
            ALLOW_FLAG
          )
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should not allow for non ROOT', async () => {
      await acl.grantWithOracle(
        acl.address,
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        ALLOW_FLAG
      );
      await expect(
        acl
          .connect(otherSigner)
          .grantWithOracle(
            acl.address,
            otherSigner.address,
            ROOT_PERMISSION_ID,
            ALLOW_FLAG
          )
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });

  describe('revoke', () => {
    it('should revoke', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await acl.revoke(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      const permission = await acl.getAuthPermission(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID
      );
      expect(permission).to.be.equal(UNSET_PERMISSION_ID);
    });

    it('should emit Revoked', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        acl.revoke(acl.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.emit(acl, 'Revoked');
    });

    it('should revert if not granted', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        acl
          .connect(otherSigner)
          .revoke(acl.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should revert if frozen', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await acl.freeze(acl.address, ADMIN_PERMISSION_ID);
      await expect(
        acl.revoke(acl.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError('PermissionFrozen', acl.address, ADMIN_PERMISSION_ID)
      );
    });

    it('should revert if already revoked', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await acl.revoke(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        acl.revoke(acl.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionAlreadyRevoked',
          acl.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID
        )
      );
    });

    it('should not allow', async () => {
      await expect(
        acl
          .connect(otherSigner)
          .revoke(acl.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should not allow for non ROOT', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        acl
          .connect(otherSigner)
          .revoke(acl.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });

  describe('freeze', () => {
    it('should freeze', async () => {
      await acl.freeze(acl.address, ADMIN_PERMISSION_ID);
      const forzen = await acl.getFreezePermission(
        acl.address,
        ADMIN_PERMISSION_ID
      );
      expect(forzen).to.be.equal(true);
    });

    it('should emit Frozen', async () => {
      await expect(acl.freeze(acl.address, ADMIN_PERMISSION_ID)).to.emit(
        acl,
        'Frozen'
      );
    });

    it('should revert if already frozen', async () => {
      await acl.freeze(acl.address, ADMIN_PERMISSION_ID);
      await expect(
        acl.freeze(acl.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError('PermissionFrozen', acl.address, ADMIN_PERMISSION_ID)
      );
    });

    it('should not allow', async () => {
      await expect(
        acl.connect(otherSigner).freeze(acl.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should not allow for non ROOT', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        acl.connect(otherSigner).freeze(acl.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });

  describe('bulk', () => {
    it('should bulk grant ADMIN_PERMISSION_ID', async () => {
      const signers = await ethers.getSigners();
      const bulkItems: BulkItem[] = [
        {
          operation: BulkOP.Grant,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[1].address,
        },
        {
          operation: BulkOP.Grant,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[2].address,
        },
        {
          operation: BulkOP.Grant,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[3].address,
        },
      ];
      await acl.bulk(acl.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await acl.getAuthPermission(
          acl.address,
          item.who,
          item.permissionID
        );
        expect(permission).to.be.equal(ALLOW_FLAG);
      }
    });

    it('should bulk freeze', async () => {
      const signers = await ethers.getSigners();
      const bulkItems: BulkItem[] = [
        {
          operation: BulkOP.Freeze,
          permissionID: ethers.utils.id('PERMISSION_ID_1'),
          who: signers[1].address,
        },
        {
          operation: BulkOP.Freeze,
          permissionID: ethers.utils.id('PERMISSION_ID_2'),
          who: signers[2].address,
        },
        {
          operation: BulkOP.Freeze,
          permissionID: ethers.utils.id('PERMISSION_ID_3'),
          who: signers[3].address,
        },
      ];
      await acl.bulk(acl.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await acl.getFreezePermission(
          acl.address,
          item.permissionID
        );
        expect(permission).to.be.equal(true);
      }
    });

    it('should bulk revoke', async () => {
      const signers = await ethers.getSigners();
      await acl.grant(acl.address, signers[1].address, ADMIN_PERMISSION_ID);
      await acl.grant(acl.address, signers[2].address, ADMIN_PERMISSION_ID);
      await acl.grant(acl.address, signers[3].address, ADMIN_PERMISSION_ID);
      const bulkItems: BulkItem[] = [
        {
          operation: BulkOP.Revoke,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[1].address,
        },
        {
          operation: BulkOP.Revoke,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[2].address,
        },
        {
          operation: BulkOP.Revoke,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[3].address,
        },
      ];
      await acl.bulk(acl.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await acl.getAuthPermission(
          acl.address,
          item.who,
          item.permissionID
        );
        expect(permission).to.be.equal(UNSET_PERMISSION_ID);
      }
    });

    it('should handle bulk mixed', async () => {
      const signers = await ethers.getSigners();
      await acl.grant(acl.address, signers[1].address, ADMIN_PERMISSION_ID);
      const bulkItems: BulkItem[] = [
        {
          operation: BulkOP.Revoke,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[1].address,
        },
        {
          operation: BulkOP.Grant,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[2].address,
        },
        {
          operation: BulkOP.Freeze,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[3].address,
        },
      ];

      await acl.bulk(acl.address, bulkItems);
      expect(
        await acl.getAuthPermission(
          acl.address,
          signers[1].address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(UNSET_PERMISSION_ID);
      expect(
        await acl.getAuthPermission(
          acl.address,
          signers[2].address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(ALLOW_FLAG);
      expect(
        await acl.getFreezePermission(acl.address, ADMIN_PERMISSION_ID)
      ).to.be.equal(true);
    });

    it('should revert on error', async () => {
      const signers = await ethers.getSigners();
      await acl.grant(acl.address, signers[1].address, ADMIN_PERMISSION_ID);
      const bulkItems: BulkItem[] = [
        {
          operation: BulkOP.Revoke,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[1].address,
        },
        {
          operation: BulkOP.Grant,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[2].address,
        },
        {
          operation: BulkOP.Freeze,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[3].address,
        },
        {
          operation: BulkOP.Freeze,
          permissionID: ADMIN_PERMISSION_ID,
          who: signers[3].address,
        },
      ];

      await expect(acl.bulk(acl.address, bulkItems)).to.be.revertedWith(
        customError('PermissionFrozen', acl.address, ADMIN_PERMISSION_ID)
      );
      expect(
        await acl.getAuthPermission(
          acl.address,
          signers[1].address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(ALLOW_FLAG);
      expect(
        await acl.getAuthPermission(
          acl.address,
          signers[2].address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(UNSET_PERMISSION_ID);
      expect(
        await acl.getFreezePermission(acl.address, ADMIN_PERMISSION_ID)
      ).to.be.equal(false);
    });

    it('should not allow', async () => {
      const bulkItems: BulkItem[] = [
        {
          operation: BulkOP.Grant,
          permissionID: ADMIN_PERMISSION_ID,
          who: otherSigner.address,
        },
      ];
      await expect(
        acl.connect(otherSigner).bulk(acl.address, bulkItems)
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should not allow for non ROOT', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      const bulkItems: BulkItem[] = [
        {
          operation: BulkOP.Grant,
          permissionID: ADMIN_PERMISSION_ID,
          who: otherSigner.address,
        },
      ];
      await expect(
        acl.connect(otherSigner).bulk(acl.address, bulkItems)
      ).to.be.revertedWith(
        customError(
          'PermissionUnauthorized',
          acl.address,
          acl.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });

  describe('checkPermissions', () => {
    it('should return true fcr granted user', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_PERMISSION_ID);
      const checkPermissions = await acl.callStatic.checkPermissions(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(checkPermissions).to.be.equal(true);
    });

    it('should return false for non granted user', async () => {
      const checkPermissions = await acl.callStatic.checkPermissions(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(checkPermissions).to.be.equal(false);
    });

    it('should return true for any who granted permissionID', async () => {
      const anyAddr = await acl.getAnyAddr();
      await acl.grant(acl.address, anyAddr, ADMIN_PERMISSION_ID);
      const checkPermissions = await acl.callStatic.checkPermissions(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(checkPermissions).to.be.equal(true);
    });

    it('should return true for any where granted permissionID', async () => {
      const anyAddr = await acl.getAnyAddr();
      await acl.grant(anyAddr, otherSigner.address, ADMIN_PERMISSION_ID);
      const checkPermissions = await acl.callStatic.checkPermissions(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(checkPermissions).to.be.equal(true);
    });

    it('should be callable by anyone', async () => {
      const checkPermissions = await acl
        .connect(otherSigner)
        .callStatic.checkPermissions(
          acl.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          []
        );
      expect(checkPermissions).to.be.equal(false);
    });
  });

  describe('isFrozen', () => {
    it('should return true', async () => {
      await acl.freeze(acl.address, ADMIN_PERMISSION_ID);
      const isFrozen = await acl.callStatic.isFrozen(
        acl.address,
        ADMIN_PERMISSION_ID
      );
      expect(isFrozen).to.be.equal(true);
    });

    it('should return false', async () => {
      const isFrozen = await acl.callStatic.isFrozen(
        acl.address,
        ADMIN_PERMISSION_ID
      );
      expect(isFrozen).to.be.equal(false);
    });

    it('should be callable by anyone', async () => {
      const isFrozen = await acl
        .connect(otherSigner)
        .callStatic.isFrozen(acl.address, ADMIN_PERMISSION_ID);
      expect(isFrozen).to.be.equal(false);
    });
  });

  describe('_checkPermission', () => {
    let permissionOracle: PermissionOracleMock;

    beforeEach(async () => {
      const aclOracleFactory = await ethers.getContractFactory(
        'PermissionOracleMock'
      );
      permissionOracle = await aclOracleFactory.deploy();
    });

    it('should call IPermissionOracle.checkPermissions', async () => {
      await acl.grantWithOracle(
        acl.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        permissionOracle.address
      );
      expect(
        await acl.callStatic.checkPermissions(
          acl.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          []
        )
      ).to.be.equal(true);

      await permissionOracle.setWillPerform(false);
      expect(
        await acl.callStatic.checkPermissions(
          acl.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          []
        )
      ).to.be.equal(false);
    });
  });

  describe('helpers', () => {
    it('should hash PERMISSIONS', async () => {
      const packed = ethers.utils.solidityPack(
        ['string', 'address', 'address', 'address'],
        ['PERMISSION', ownerSigner.address, acl.address, ROOT_PERMISSION_ID]
      );
      const hash = ethers.utils.keccak256(packed);
      const contractHash = await acl.getPermissionHash(
        acl.address,
        ownerSigner.address,
        ROOT_PERMISSION_ID
      );
      expect(hash).to.be.equal(contractHash);
    });

    it('should hash FREEZE', async () => {
      const packed = ethers.utils.solidityPack(
        ['string', 'address', 'address'],
        ['FREEZE', acl.address, ROOT_PERMISSION_ID]
      );
      const hash = ethers.utils.keccak256(packed);
      const contractHash = await acl.getFreezeHash(
        acl.address,
        ROOT_PERMISSION_ID
      );
      expect(hash).to.be.equal(contractHash);
    });
  });
});
