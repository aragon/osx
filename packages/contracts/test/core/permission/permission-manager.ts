import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {PermissionManagerTest, PermissionOracleMock} from '../../../typechain';
import {customError} from '../../test-utils/custom-error-helper';

const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');
const ADMIN_PERMISSION_ID = ethers.utils.id('ADMIN_PERMISSION');
const UNSET_FLAG = ethers.utils.getAddress(
  '0x0000000000000000000000000000000000000000'
);
const ALLOW_FLAG = ethers.utils.getAddress(
  '0x0000000000000000000000000000000000000002'
);

const addressZero = ethers.constants.AddressZero;

enum Operation {
  Grant,
  Revoke,
  Freeze,
  GrantWithOracle,
}

interface ItemSingleTarget {
  operation: Operation;
  who: string;
  permissionId: string;
}

interface ItemMultiTarget {
  operation: Operation;
  where: string;
  who: string;
  oracle: string;
  permissionId: string;
}

describe('Core: PermissionManager', function () {
  let pm: PermissionManagerTest;
  let ownerSigner: SignerWithAddress;
  let otherSigner: SignerWithAddress;

  before(async () => {
    const signers = await ethers.getSigners();
    ownerSigner = signers[0];
    otherSigner = signers[1];
  });

  beforeEach(async () => {
    const PM = await ethers.getContractFactory('PermissionManagerTest');
    pm = await PM.deploy();
    await pm.init(ownerSigner.address);
  });

  describe('init', () => {
    it('should allow init call only once', async () => {
      await expect(pm.init(ownerSigner.address)).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });

    it('should emit Granted', async () => {
      const PM = await ethers.getContractFactory('PermissionManagerTest');
      pm = await PM.deploy();
      await expect(pm.init(ownerSigner.address)).to.emit(pm, 'Granted');
    });

    it('should add ROOT_PERMISSION', async () => {
      const permission = await pm.getAuthPermission(
        pm.address,
        ownerSigner.address,
        ROOT_PERMISSION_ID
      );
      expect(permission).to.be.equal(ALLOW_FLAG);
    });
  });

  describe('grant', () => {
    it('should add permission', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      const permission = await pm.getAuthPermission(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID
      );
      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should emit Granted', async () => {
      await expect(
        pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.emit(pm, 'Granted');
    });

    it('should revert with already granted', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionAlreadyGranted',
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID
        )
      );
    });

    it('should revert if frozen', async () => {
      await pm.freeze(pm.address, ADMIN_PERMISSION_ID);
      await expect(
        pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError('PermissionFrozen', pm.address, ADMIN_PERMISSION_ID)
      );
    });

    it('should not allow grant', async () => {
      await expect(
        pm
          .connect(otherSigner)
          .grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should not allow for non ROOT', async () => {
      await pm.grant(pm.address, ownerSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm
          .connect(otherSigner)
          .grant(pm.address, otherSigner.address, ROOT_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });

  describe('grantWithOrpme', () => {
    it('should add permission', async () => {
      await pm.grantWithOracle(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        ALLOW_FLAG
      );
      const permission = await pm.getAuthPermission(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID
      );
      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should emit Granted', async () => {
      await expect(
        pm.grantWithOracle(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          ALLOW_FLAG
        )
      ).to.emit(pm, 'Granted');
    });

    it('should revert with already granted', async () => {
      await pm.grantWithOracle(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        ALLOW_FLAG
      );
      await expect(
        pm.grantWithOracle(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          ALLOW_FLAG
        )
      ).to.be.revertedWith(
        customError(
          'PermissionAlreadyGranted',
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID
        )
      );
    });

    it('should revert if frozen', async () => {
      await pm.freeze(pm.address, ADMIN_PERMISSION_ID);
      await expect(
        pm.grantWithOracle(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          ALLOW_FLAG
        )
      ).to.be.revertedWith(
        customError('PermissionFrozen', pm.address, ADMIN_PERMISSION_ID)
      );
    });

    it('should set PermissionOracle', async () => {
      const signers = await ethers.getSigners();
      await pm.grantWithOracle(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        signers[2].address
      );
      expect(
        await pm.getAuthPermission(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(signers[2].address);
    });

    it('should not allow grant', async () => {
      await expect(
        pm
          .connect(otherSigner)
          .grantWithOracle(
            pm.address,
            otherSigner.address,
            ADMIN_PERMISSION_ID,
            ALLOW_FLAG
          )
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should not allow for non ROOT', async () => {
      await pm.grantWithOracle(
        pm.address,
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        ALLOW_FLAG
      );
      await expect(
        pm
          .connect(otherSigner)
          .grantWithOracle(
            pm.address,
            otherSigner.address,
            ROOT_PERMISSION_ID,
            ALLOW_FLAG
          )
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });

  describe('revoke', () => {
    it('should revoke', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await pm.revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      const permission = await pm.getAuthPermission(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID
      );
      expect(permission).to.be.equal(UNSET_FLAG);
    });

    it('should emit Revoked', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm.revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.emit(pm, 'Revoked');
    });

    it('should revert if not granted', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm
          .connect(otherSigner)
          .revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should revert if frozen', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await pm.freeze(pm.address, ADMIN_PERMISSION_ID);
      await expect(
        pm.revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError('PermissionFrozen', pm.address, ADMIN_PERMISSION_ID)
      );
    });

    it('should revert if already revoked', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await pm.revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm.revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'PermissionAlreadyRevoked',
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID
        )
      );
    });

    it('should not allow', async () => {
      await expect(
        pm
          .connect(otherSigner)
          .revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should not allow for non ROOT', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm
          .connect(otherSigner)
          .revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });

  describe('freeze', () => {
    it('should freeze', async () => {
      await pm.freeze(pm.address, ADMIN_PERMISSION_ID);
      const frozen = await pm.isFrozen(pm.address, ADMIN_PERMISSION_ID);
      expect(frozen).to.be.equal(true);
    });

    it('should emit Frozen', async () => {
      await expect(pm.freeze(pm.address, ADMIN_PERMISSION_ID)).to.emit(
        pm,
        'Frozen'
      );
    });

    it('should revert if already frozen', async () => {
      await pm.freeze(pm.address, ADMIN_PERMISSION_ID);
      await expect(
        pm.freeze(pm.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError('PermissionFrozen', pm.address, ADMIN_PERMISSION_ID)
      );
    });

    it('should not allow', async () => {
      await expect(
        pm.connect(otherSigner).freeze(pm.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should not allow for non ROOT', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm.connect(otherSigner).freeze(pm.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });

  describe('bulk on multiple target', () => {
    it('should bulk grant ADMIN_PERMISSION on different targets', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(pm.address, signers[0].address, ADMIN_PERMISSION_ID);
      const bulkItems: ItemMultiTarget[] = [
        {
          operation: Operation.Grant,
          where: signers[1].address,
          who: signers[2].address,
          oracle: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          where: signers[2].address,
          who: signers[3].address,
          oracle: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];

      await pm.bulkOnMultiTarget(bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.getAuthPermission(
          item.where,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(ALLOW_FLAG);
      }
    });

    it('should bulk freeze', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(
        pm.address,
        signers[0].address,
        ethers.utils.id('PERMISSION_ID_1')
      );
      await pm.grant(
        pm.address,
        signers[0].address,
        ethers.utils.id('PERMISSION_ID_2')
      );
      const bulkItems: ItemMultiTarget[] = [
        {
          operation: Operation.Freeze,
          where: signers[1].address,
          who: signers[2].address,
          oracle: addressZero,
          permissionId: ethers.utils.id('PERMISSION_ID_1'),
        },
        {
          operation: Operation.Freeze,
          where: signers[2].address,
          who: signers[3].address,
          oracle: addressZero,
          permissionId: ethers.utils.id('PERMISSION_ID_2'),
        },
      ];
      await pm.bulkOnMultiTarget(bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.isFrozen(item.where, item.permissionId);
        expect(permission).to.be.equal(true);
      }
    });

    it('should bulk revoke', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(
        signers[1].address,
        signers[0].address,
        ADMIN_PERMISSION_ID
      );
      await pm.grant(
        signers[2].address,
        signers[0].address,
        ADMIN_PERMISSION_ID
      );
      const bulkItems: ItemMultiTarget[] = [
        {
          operation: Operation.Revoke,
          where: signers[1].address,
          who: signers[0].address,
          oracle: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Revoke,
          where: signers[2].address,
          who: signers[0].address,
          oracle: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await pm.bulkOnMultiTarget(bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.getAuthPermission(
          item.where,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(UNSET_FLAG);
      }
    });

    it('should grant with oracle', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(pm.address, signers[0].address, ADMIN_PERMISSION_ID);
      const bulkItems: ItemMultiTarget[] = [
        {
          operation: Operation.GrantWithOracle,
          where: signers[1].address,
          who: signers[0].address,
          oracle: signers[3].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.GrantWithOracle,
          where: signers[2].address,
          who: signers[0].address,
          oracle: signers[4].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await pm.bulkOnMultiTarget(bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.getAuthPermission(
          item.where,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(item.oracle);
      }
    });

    it('throws Unauthorized error when caller does not have ROOT_PERMISSION_ID permission', async () => {
      const signers = await ethers.getSigners();
      const bulkItems: ItemMultiTarget[] = [
        {
          operation: Operation.Grant,
          where: signers[1].address,
          who: signers[0].address,
          oracle: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];

      await expect(
        pm.connect(signers[2]).bulkOnMultiTarget(bulkItems)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          signers[1].address,
          signers[2].address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });
  describe('bulk on single target', () => {
    it('should bulk grant ADMIN_PERMISSION', async () => {
      const signers = await ethers.getSigners();
      const bulkItems: ItemSingleTarget[] = [
        {
          operation: Operation.Grant,
          who: signers[1].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          who: signers[2].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          who: signers[3].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await pm.bulkOnSingleTarget(pm.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.getAuthPermission(
          pm.address,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(ALLOW_FLAG);
      }
    });

    it('should bulk freeze', async () => {
      const signers = await ethers.getSigners();
      const bulkItems: ItemSingleTarget[] = [
        {
          operation: Operation.Freeze,
          who: signers[1].address,
          permissionId: ethers.utils.id('PERMISSION_ID_1'),
        },
        {
          operation: Operation.Freeze,
          who: signers[2].address,
          permissionId: ethers.utils.id('PERMISSION_ID_2'),
        },
        {
          operation: Operation.Freeze,
          who: signers[3].address,
          permissionId: ethers.utils.id('PERMISSION_ID_3'),
        },
      ];
      await pm.bulkOnSingleTarget(pm.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.isFrozen(pm.address, item.permissionId);
        expect(permission).to.be.equal(true);
      }
    });

    it('should bulk revoke', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(pm.address, signers[1].address, ADMIN_PERMISSION_ID);
      await pm.grant(pm.address, signers[2].address, ADMIN_PERMISSION_ID);
      await pm.grant(pm.address, signers[3].address, ADMIN_PERMISSION_ID);
      const bulkItems: ItemSingleTarget[] = [
        {
          operation: Operation.Revoke,
          who: signers[1].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Revoke,
          who: signers[2].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Revoke,
          who: signers[3].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await pm.bulkOnSingleTarget(pm.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.getAuthPermission(
          pm.address,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(UNSET_FLAG);
      }
    });

    it('should handle bulk mixed', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(pm.address, signers[1].address, ADMIN_PERMISSION_ID);
      const bulkItems: ItemSingleTarget[] = [
        {
          operation: Operation.Revoke,
          who: signers[1].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          who: signers[2].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Freeze,
          who: signers[3].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];

      await pm.bulkOnSingleTarget(pm.address, bulkItems);
      expect(
        await pm.getAuthPermission(
          pm.address,
          signers[1].address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(UNSET_FLAG);
      expect(
        await pm.getAuthPermission(
          pm.address,
          signers[2].address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(ALLOW_FLAG);
      expect(await pm.isFrozen(pm.address, ADMIN_PERMISSION_ID)).to.be.equal(
        true
      );
    });

    it('should revert on error', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(pm.address, signers[1].address, ADMIN_PERMISSION_ID);
      const bulkItems: ItemSingleTarget[] = [
        {
          operation: Operation.Revoke,
          who: signers[1].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          who: signers[2].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Freeze,
          who: signers[3].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Freeze,
          who: signers[3].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];

      await expect(
        pm.bulkOnSingleTarget(pm.address, bulkItems)
      ).to.be.revertedWith(
        customError('PermissionFrozen', pm.address, ADMIN_PERMISSION_ID)
      );
      expect(
        await pm.getAuthPermission(
          pm.address,
          signers[1].address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(ALLOW_FLAG);
      expect(
        await pm.getAuthPermission(
          pm.address,
          signers[2].address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(UNSET_FLAG);
      expect(await pm.isFrozen(pm.address, ADMIN_PERMISSION_ID)).to.be.equal(
        false
      );
    });

    it('should not allow', async () => {
      const bulkItems: ItemSingleTarget[] = [
        {
          operation: Operation.Grant,
          who: otherSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await expect(
        pm.connect(otherSigner).bulkOnSingleTarget(pm.address, bulkItems)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('should not allow for non ROOT', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      const bulkItems: ItemSingleTarget[] = [
        {
          operation: Operation.Grant,
          who: otherSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await expect(
        pm.connect(otherSigner).bulkOnSingleTarget(pm.address, bulkItems)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pm.address,
          pm.address,
          otherSigner.address,
          ROOT_PERMISSION_ID
        )
      );
    });
  });

  describe('isGranted', () => {
    it('should return true if the permission is granted to the user', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      const isGranted = await pm.callStatic.isGranted(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(isGranted).to.be.equal(true);
    });

    it('should return false if the permissions is not granted to the user', async () => {
      const isGranted = await pm.callStatic.isGranted(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(isGranted).to.be.equal(false);
    });

    it('should return true for permissions granted to any address on a specific target contract using the `ANY_ADDR` flag', async () => {
      const anyAddr = await pm.getAnyAddr();
      await pm.grant(pm.address, anyAddr, ADMIN_PERMISSION_ID);
      const isGranted = await pm.callStatic.isGranted(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(isGranted).to.be.equal(true);
    });

    it('should return true for permissions granted to a specifc address on any target contract using the `ANY_ADDR` flag', async () => {
      const anyAddr = await pm.getAnyAddr();
      await pm.grant(anyAddr, otherSigner.address, ADMIN_PERMISSION_ID);
      const isGranted = await pm.callStatic.isGranted(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(isGranted).to.be.equal(true);
    });

    it('should be callable by anyone', async () => {
      const isGranted = await pm
        .connect(otherSigner)
        .callStatic.isGranted(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          []
        );
      expect(isGranted).to.be.equal(false);
    });
  });

  describe('isFrozen', () => {
    it('should return true', async () => {
      await pm.freeze(pm.address, ADMIN_PERMISSION_ID);
      const isFrozen = await pm.callStatic.isFrozen(
        pm.address,
        ADMIN_PERMISSION_ID
      );
      expect(isFrozen).to.be.equal(true);
    });

    it('should return false', async () => {
      const isFrozen = await pm.callStatic.isFrozen(
        pm.address,
        ADMIN_PERMISSION_ID
      );
      expect(isFrozen).to.be.equal(false);
    });

    it('should be callable by anyone', async () => {
      const isFrozen = await pm
        .connect(otherSigner)
        .callStatic.isFrozen(pm.address, ADMIN_PERMISSION_ID);
      expect(isFrozen).to.be.equal(false);
    });
  });

  describe('_hasPermission', () => {
    let permissionOracle: PermissionOracleMock;

    beforeEach(async () => {
      const aclOracleFactory = await ethers.getContractFactory(
        'PermissionOracleMock'
      );
      permissionOracle = await aclOracleFactory.deploy();
    });

    it('should call IPermissionOracle.isGranted', async () => {
      await pm.grantWithOracle(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        permissionOracle.address
      );
      expect(
        await pm.callStatic.isGranted(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          []
        )
      ).to.be.equal(true);

      await permissionOracle.setWillPerform(false);
      expect(
        await pm.callStatic.isGranted(
          pm.address,
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
        ['PERMISSION', ownerSigner.address, pm.address, ROOT_PERMISSION_ID]
      );
      const hash = ethers.utils.keccak256(packed);
      const contractHash = await pm.getPermissionHash(
        pm.address,
        ownerSigner.address,
        ROOT_PERMISSION_ID
      );
      expect(hash).to.be.equal(contractHash);
    });

    it('should hash IMMUTABLE', async () => {
      const packed = ethers.utils.solidityPack(
        ['string', 'address', 'address'],
        ['IMMUTABLE', pm.address, ROOT_PERMISSION_ID]
      );
      const hash = ethers.utils.keccak256(packed);
      const contractHash = await pm.getFrozenPermissionHash(
        pm.address,
        ROOT_PERMISSION_ID
      );
      expect(hash).to.be.equal(contractHash);
    });
  });
});
