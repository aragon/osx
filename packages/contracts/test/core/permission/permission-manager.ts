import {
  PermissionManagerTest,
  PermissionConditionMock,
  PermissionManagerTest__factory,
  PermissionConditionMock__factory,
} from '../../../typechain';
import {MultiTargetPermission, Operation} from '@aragon/osx-commons-sdk';
import {DAO_PERMISSIONS} from '@aragon/osx-commons-sdk';
import {PluginUUPSUpgradeableV1Mock__factory} from '@aragon/osx-ethers-v1.2.0';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ethers} from 'hardhat';

const ADMIN_PERMISSION_ID = ethers.utils.id('ADMIN_PERMISSION');
const RESTRICTED_PERMISSIONS_FOR_ANY_ADDR = [
  DAO_PERMISSIONS.ROOT_PERMISSION_ID,
  ethers.utils.id('TEST_PERMISSION_1'),
  ethers.utils.id('TEST_PERMISSION_2'),
];

const UNSET_FLAG = ethers.utils.getAddress(
  '0x0000000000000000000000000000000000000000'
);
const ALLOW_FLAG = ethers.utils.getAddress(
  '0x0000000000000000000000000000000000000002'
);
export const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff';

const addressZero = ethers.constants.AddressZero;

let conditionMock: PermissionConditionMock;

interface SingleTargetPermission {
  operation: Operation;
  who: string;
  permissionId: string;
}

describe('Core: PermissionManager', function () {
  let pm: PermissionManagerTest;
  let signers: SignerWithAddress[];
  let ownerSigner: SignerWithAddress;
  let otherSigner: SignerWithAddress;

  before(async () => {
    signers = await ethers.getSigners();
    ownerSigner = signers[0];
    otherSigner = signers[1];
  });

  beforeEach(async () => {
    const PM = new PermissionManagerTest__factory(signers[0]);
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
      const PM = new PermissionManagerTest__factory(ownerSigner);
      pm = await PM.deploy();
      await expect(pm.init(ownerSigner.address)).to.emit(pm, 'Granted');
    });

    it('should add ROOT_PERMISSION', async () => {
      const permission = await pm.getAuthPermission(
        pm.address,
        ownerSigner.address,
        DAO_PERMISSIONS.ROOT_PERMISSION_ID
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

    it('reverts if both `_who == ANY_ADDR` and `_where == ANY_ADDR', async () => {
      await expect(
        pm.grant(ANY_ADDR, ANY_ADDR, DAO_PERMISSIONS.ROOT_PERMISSION_ID)
      ).to.be.revertedWithCustomError(pm, 'PermissionsForAnyAddressDisallowed');
    });

    it('reverts if permissionId is restricted and `_who == ANY_ADDR`', async () => {
      await expect(
        pm.grant(pm.address, ANY_ADDR, RESTRICTED_PERMISSIONS_FOR_ANY_ADDR[0])
      ).to.be.revertedWithCustomError(pm, 'PermissionsForAnyAddressDisallowed');
    });

    it('succeeds if permissionId is not restricted and `_who == ANY_ADDR`', async () => {
      await expect(pm.grant(pm.address, ANY_ADDR, ADMIN_PERMISSION_ID)).to.not
        .be.reverted;
    });

    it('reverts if permissionId is restricted and `_where == ANY_ADDR`', async () => {
      await expect(
        pm.grant(ANY_ADDR, pm.address, RESTRICTED_PERMISSIONS_FOR_ANY_ADDR[0])
      ).to.be.revertedWithCustomError(pm, 'PermissionsForAnyAddressDisallowed');
    });

    it('reverts if permissionId is not restricted and `_where == ANY_ADDR`', async () => {
      await expect(
        pm.grant(ANY_ADDR, pm.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWithCustomError(pm, 'PermissionsForAnyAddressDisallowed');
    });

    it('should emit Granted', async () => {
      await expect(
        pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.emit(pm, 'Granted');
    });

    it('should not emit granted event if already granted', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.not.emit(pm, 'Granted');
    });

    it('should not allow grant', async () => {
      await expect(
        pm
          .connect(otherSigner)
          .grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );
    });

    it('should not allow for non ROOT', async () => {
      await pm.grant(pm.address, ownerSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm
          .connect(otherSigner)
          .grant(
            pm.address,
            otherSigner.address,
            DAO_PERMISSIONS.ROOT_PERMISSION_ID
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );
    });
  });

  describe('grantWithCondition', () => {
    before(async () => {
      conditionMock = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();
    });

    it('reverts if the condition address is not a contract', async () => {
      await expect(
        pm.grantWithCondition(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          ethers.constants.AddressZero
        )
      )
        .to.be.revertedWithCustomError(pm, 'ConditionNotAContract')
        .withArgs(ethers.constants.AddressZero);
    });

    it('reverts if the condition contract does not support `IPermissionConditon`', async () => {
      const nonConditionContract =
        await new PluginUUPSUpgradeableV1Mock__factory(signers[0]).deploy();

      await expect(
        pm.grantWithCondition(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          nonConditionContract.address
        )
      )
        .to.be.revertedWithCustomError(pm, 'ConditionInterfaceNotSupported')
        .withArgs(nonConditionContract.address);
    });

    it('should add permission', async () => {
      await pm.grantWithCondition(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        conditionMock.address
      );
      const permission = await pm.getAuthPermission(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID
      );
      expect(permission).to.be.equal(conditionMock.address);
    });

    it('should emit Granted', async () => {
      await expect(
        pm.grantWithCondition(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          conditionMock.address
        )
      ).to.emit(pm, 'Granted');
    });

    it('should emit Granted when condition is present and `who == ANY_ADDR` or `where == ANY_ADDR`', async () => {
      await expect(
        pm.grantWithCondition(
          pm.address,
          ANY_ADDR,
          ADMIN_PERMISSION_ID,
          conditionMock.address
        )
      ).to.emit(pm, 'Granted');

      await expect(
        pm.grantWithCondition(
          ANY_ADDR,
          pm.address,
          ADMIN_PERMISSION_ID,
          conditionMock.address
        )
      ).to.emit(pm, 'Granted');
    });

    it('should not emit Granted with already granted with the same condition or ALLOW_FLAG', async () => {
      await pm.grantWithCondition(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        conditionMock.address
      );
      await expect(
        pm.grantWithCondition(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          conditionMock.address
        )
      ).to.not.emit(pm, 'Granted');
    });

    it('reverts if tries to grant the same permission, but with different condition', async () => {
      await pm.grantWithCondition(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        conditionMock.address
      );

      const newConditionMock = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();

      await expect(
        pm.grantWithCondition(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          newConditionMock.address
        )
      )
        .to.be.revertedWithCustomError(
          pm,
          'PermissionAlreadyGrantedForDifferentCondition'
        )
        .withArgs(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          conditionMock.address,
          newConditionMock.address
        );
    });

    it('should set PermissionCondition', async () => {
      await pm.grantWithCondition(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        conditionMock.address
      );
      expect(
        await pm.getAuthPermission(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(conditionMock.address);
    });

    it('should not allow grant', async () => {
      await expect(
        pm
          .connect(otherSigner)
          .grantWithCondition(
            pm.address,
            otherSigner.address,
            ADMIN_PERMISSION_ID,
            conditionMock.address
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );
    });

    it('reverts if the caller does not have `ROOT_PERMISSION_ID`', async () => {
      await pm.grantWithCondition(
        pm.address,
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        conditionMock.address
      );
      await expect(
        pm
          .connect(otherSigner)
          .grantWithCondition(
            pm.address,
            otherSigner.address,
            DAO_PERMISSIONS.ROOT_PERMISSION_ID,
            conditionMock.address
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
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
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );
    });

    it('should not emit revoked if already revoked', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await pm.revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm.revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      ).to.not.emit(pm, 'Revoked');
    });

    it('should not allow', async () => {
      await expect(
        pm
          .connect(otherSigner)
          .revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );
    });

    it('should not allow for non ROOT', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm
          .connect(otherSigner)
          .revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );
    });
  });

  describe('bulk on multiple target', () => {
    it('should bulk grant ADMIN_PERMISSION on different targets', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(pm.address, signers[0].address, ADMIN_PERMISSION_ID);
      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.Grant,
          where: signers[1].address,
          who: signers[2].address,
          condition: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          where: signers[2].address,
          who: signers[3].address,
          condition: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];

      await pm.applyMultiTargetPermissions(bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.getAuthPermission(
          item.where,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(ALLOW_FLAG);
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
      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.Revoke,
          where: signers[1].address,
          who: signers[0].address,
          condition: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Revoke,
          where: signers[2].address,
          who: signers[0].address,
          condition: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await pm.applyMultiTargetPermissions(bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.getAuthPermission(
          item.where,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(UNSET_FLAG);
      }
    });

    it('should revert if non-zero condition is used with `grant` operation type', async () => {
      const signers = await ethers.getSigners();

      const conditionMock = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();

      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.Grant,
          where: signers[1].address,
          who: signers[0].address,
          condition: conditionMock.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];

      await expect(
        pm.applyMultiTargetPermissions(bulkItems)
      ).to.be.revertedWithCustomError(pm, 'GrantWithConditionNotSupported');
    });

    it('should grant with condition', async () => {
      const signers = await ethers.getSigners();

      const conditionMock2 = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();

      await pm.grant(pm.address, signers[0].address, ADMIN_PERMISSION_ID);
      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.GrantWithCondition,
          where: signers[1].address,
          who: signers[0].address,
          condition: conditionMock.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.GrantWithCondition,
          where: signers[2].address,
          who: signers[0].address,
          condition: conditionMock2.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await pm.applyMultiTargetPermissions(bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.getAuthPermission(
          item.where,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(item.condition);
      }
    });

    it('throws Unauthorized error when caller does not have ROOT_PERMISSION_ID permission', async () => {
      const signers = await ethers.getSigners();
      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.Grant,
          where: signers[1].address,
          who: signers[0].address,
          condition: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];

      await expect(
        pm.connect(signers[2]).applyMultiTargetPermissions(bulkItems)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          signers[2].address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );
    });
  });

  describe('bulk on single target', () => {
    it('should bulk grant ADMIN_PERMISSION', async () => {
      const signers = await ethers.getSigners();
      const bulkItems: SingleTargetPermission[] = [
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
      await pm.applySingleTargetPermissions(pm.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.getAuthPermission(
          pm.address,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(ALLOW_FLAG);
      }
    });

    it('should bulk revoke', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(pm.address, signers[1].address, ADMIN_PERMISSION_ID);
      await pm.grant(pm.address, signers[2].address, ADMIN_PERMISSION_ID);
      await pm.grant(pm.address, signers[3].address, ADMIN_PERMISSION_ID);
      const bulkItems: SingleTargetPermission[] = [
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
      await pm.applySingleTargetPermissions(pm.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await pm.getAuthPermission(
          pm.address,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(UNSET_FLAG);
      }
    });

    it('reverts for `Operation.GrantWithCondition` ', async () => {
      const signers = await ethers.getSigners();
      const bulkItems: SingleTargetPermission[] = [
        {
          operation: Operation.GrantWithCondition,
          who: signers[1].address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await expect(
        pm.applySingleTargetPermissions(pm.address, bulkItems)
      ).to.be.revertedWithCustomError(pm, 'GrantWithConditionNotSupported');
    });

    it('should handle bulk mixed', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(pm.address, signers[1].address, ADMIN_PERMISSION_ID);
      const bulkItems: SingleTargetPermission[] = [
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
      ];

      await pm.applySingleTargetPermissions(pm.address, bulkItems);
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
    });

    it('should emit correct events on bulk', async () => {
      const signers = await ethers.getSigners();
      await pm.grant(pm.address, signers[1].address, ADMIN_PERMISSION_ID);
      const bulkItems: SingleTargetPermission[] = [
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
      ];

      await expect(pm.applySingleTargetPermissions(pm.address, bulkItems))
        .to.emit(pm, 'Revoked')
        .withArgs(
          ADMIN_PERMISSION_ID,
          ownerSigner.address,
          pm.address,
          signers[1].address
        )
        .to.emit(pm, 'Granted')
        .withArgs(
          ADMIN_PERMISSION_ID,
          ownerSigner.address,
          pm.address,
          signers[2].address,
          ALLOW_FLAG
        );
      expect(
        await pm.getAuthPermission(
          pm.address,
          signers[2].address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(ALLOW_FLAG);
    });

    it('should not allow', async () => {
      const bulkItems: SingleTargetPermission[] = [
        {
          operation: Operation.Grant,
          who: otherSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await expect(
        pm
          .connect(otherSigner)
          .applySingleTargetPermissions(pm.address, bulkItems)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );
    });

    it('should not allow for non ROOT', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      const bulkItems: SingleTargetPermission[] = [
        {
          operation: Operation.Grant,
          who: otherSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await expect(
        pm
          .connect(otherSigner)
          .applySingleTargetPermissions(pm.address, bulkItems)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );
    });
  });

  describe('isGranted', () => {
    it('returns `true` if the permission is granted to the user', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      const isGranted = await pm.callStatic.isGranted(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(isGranted).to.be.equal(true);
    });

    it('returns `false` if the permission is not granted to the user', async () => {
      const isGranted = await pm.callStatic.isGranted(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(isGranted).to.be.equal(false);
    });

    it('returns `true` if a condition is set for a specific caller and target answering `true`', async () => {
      const condition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();
      await pm.grantWithCondition(
        pm.address,
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        condition.address
      );
      await condition.setAnswer(true);

      expect(
        await pm.isGranted(
          pm.address,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          condition.address
        )
      ).to.be.true;
    });

    it('returns `true` if a condition is set for a generic caller answering `true`', async () => {
      const condition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();
      await pm.grantWithCondition(
        pm.address,
        ANY_ADDR,
        ADMIN_PERMISSION_ID,
        condition.address
      );
      await condition.setAnswer(true);

      // Check `ownerSigner.address` as a caller `_who`
      expect(
        await pm.isGranted(
          pm.address,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          condition.address
        )
      ).to.be.true;

      // Check `otherSigner.address` as a caller `_who`
      expect(
        await pm.isGranted(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          condition.address
        )
      ).to.be.true;

      // Check that `false` is returned if `address(0)` is the target `_where`.
      expect(
        await pm.isGranted(
          ethers.constants.AddressZero,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          condition.address
        )
      ).to.be.false;
    });

    it('returns `true` if a condition is set for a generic target answering `true`', async () => {
      const condition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();
      await pm.grantWithCondition(
        ANY_ADDR,
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        condition.address
      );
      await condition.setAnswer(true);

      // Check `pm.address` as a target `_where`
      expect(
        await pm.isGranted(
          pm.address,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          condition.address
        )
      ).to.be.true;

      // Check `address(0)` as a target `_where`
      expect(
        await pm.isGranted(
          ethers.constants.AddressZero,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          condition.address
        )
      ).to.be.true;

      // Check that `false` is returned if `otherSigner is the caller `_who`.
      expect(
        await pm.isGranted(
          ethers.constants.AddressZero,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          condition.address
        )
      ).to.be.false;
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

    it('does not fall back to a generic caller or target condition if a specific condition is set already answering `false`', async () => {
      const specificCondition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();
      const genericCallerCondition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();
      const genericTargetCondition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();

      // Grant with a specific condition that will answer false
      await pm.grantWithCondition(
        pm.address,
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        specificCondition.address
      );
      await specificCondition.setAnswer(false);

      // Grant with a generic caller condition that will answer true
      await pm.grantWithCondition(
        pm.address,
        ANY_ADDR,
        ADMIN_PERMISSION_ID,
        genericCallerCondition.address
      );
      await genericCallerCondition.setAnswer(true);

      // Grant with a generic target condition that will answer true
      await pm.grantWithCondition(
        ANY_ADDR,
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        genericTargetCondition.address
      );
      await genericCallerCondition.setAnswer(true);

      // Check that `isGranted` returns false for `ownerSigner` to whom the specific condition was granted.
      expect(
        await pm.isGranted(
          pm.address,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          genericTargetCondition.address
        )
      ).to.be.false;

      // Check that `ownerSigner` is still granted access to other contracts (e.g., `address(0)`) through the `genericTargetCondition` condition.
      expect(
        await pm.isGranted(
          ethers.constants.AddressZero,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          genericTargetCondition.address
        )
      ).to.be.true;
    });

    it('does not fall back to a generic target condition if a generic caller condition is set already answering `false`', async () => {
      const genericCallerCondition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();
      const genericTargetCondition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();

      // Grant with a generic caller condition that will answer false.
      await pm.grantWithCondition(
        pm.address,
        ANY_ADDR,
        ADMIN_PERMISSION_ID,
        genericCallerCondition.address
      );
      await genericCallerCondition.setAnswer(false);

      // Grant with a generic target condition that will answer true.
      await pm.grantWithCondition(
        ANY_ADDR,
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        genericTargetCondition.address
      );
      await genericTargetCondition.setAnswer(true);

      // Check that `isGranted` returns false for `ANY_ADDR` (here, we check only two addresses, `ownerSigner` and `otherSigner`).
      expect(
        await pm.isGranted(
          pm.address,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          genericTargetCondition.address
        )
      ).to.be.false;
      expect(
        await pm.isGranted(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          genericTargetCondition.address
        )
      ).to.be.false;

      // Check that `ownerSigner` is granted access to other contracts (e.g., `address(0)`) via the `genericTargetCondition` condition.
      expect(
        await pm.isGranted(
          ethers.constants.AddressZero,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          genericTargetCondition.address
        )
      ).to.be.true;

      // Check that `otherSigner` is not granted access to other contracts (e.g., `address(0)`) via the `genericTargetCondition` condition.
      expect(
        await pm.isGranted(
          ethers.constants.AddressZero,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          genericTargetCondition.address
        )
      ).to.be.false;
    });

    it('does not fall back to a generic caller or target condition if a specific condition is set already answering `false`', async () => {
      const specificCondition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();
      const genericCallerCondition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();
      const genericTargetCondition = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();

      // Grant with a specific condition that will answer false
      await pm.grantWithCondition(
        pm.address,
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        specificCondition.address
      );
      await specificCondition.setAnswer(false);

      // Grant with a generic caller condition that will answer true
      await pm.grantWithCondition(
        pm.address,
        ANY_ADDR,
        ADMIN_PERMISSION_ID,
        genericCallerCondition.address
      );
      await genericCallerCondition.setAnswer(true);

      // Grant with a generic target condition that will answer true
      await pm.grantWithCondition(
        ANY_ADDR,
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        genericTargetCondition.address
      );
      await genericCallerCondition.setAnswer(true);

      // Check that `isGranted` returns false for `ownerSigner` to whom the specific condition was granted.
      expect(
        await pm.isGranted(
          pm.address,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          genericTargetCondition.address
        )
      ).to.be.false;

      // Check that `ownerSigner` is still granted access to other contracts (e.g., `address(0)`) through the `genericTargetCondition` condition.
      expect(
        await pm.isGranted(
          ethers.constants.AddressZero,
          ownerSigner.address,
          ADMIN_PERMISSION_ID,
          genericTargetCondition.address
        )
      ).to.be.true;
    });

    it('returns `true` if the permission is granted to `_who == ANY_ADDR`', async () => {
      await pm.grant(pm.address, ANY_ADDR, ADMIN_PERMISSION_ID);
      const isGranted = await pm.callStatic.isGranted(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        []
      );
      expect(isGranted).to.be.equal(true);
    });
  });

  describe('_hasPermission', () => {
    let permissionCondition: PermissionConditionMock;

    beforeEach(async () => {
      permissionCondition = await new PermissionConditionMock__factory(
        ownerSigner
      ).deploy();
    });

    it('should call IPermissionCondition.isGranted', async () => {
      await pm.grantWithCondition(
        pm.address,
        otherSigner.address,
        ADMIN_PERMISSION_ID,
        permissionCondition.address
      );
      expect(
        await pm.callStatic.isGranted(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID,
          []
        )
      ).to.be.equal(true);

      await permissionCondition.setAnswer(false);
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
        [
          'PERMISSION',
          ownerSigner.address,
          pm.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID,
        ]
      );
      const hash = ethers.utils.keccak256(packed);
      const contractHash = await pm.getPermissionHash(
        pm.address,
        ownerSigner.address,
        DAO_PERMISSIONS.ROOT_PERMISSION_ID
      );
      expect(hash).to.be.equal(contractHash);
    });
  });
});
