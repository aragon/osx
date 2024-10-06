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
const APPLY_TARGET_PERMISSION_ID = ethers.utils.id('APPLY_TARGET_PERMISSION');
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

const GRANT_OWNER_FLAG = 1;
const REVOKE_OWNER_FLAG = 2;
const FULL_OWNER_FLAG = 3;
const FREEZE_ADDRESS = '0x0000000000000000000000000000000000000001';

const someWhere = '0xb794F5eA0ba39494cE839613fffBA74279579268';
const somePermissionId = ethers.utils.id('SOME_PERMISSION');

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

  describe('addOwner', () => {
    beforeEach(async () => {
      await pm.createPermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        ownerSigner.address,
        []
      );
    });

    it('should add an owner with all the flags passed', async () => {
      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          FULL_OWNER_FLAG
        )
      )
        .to.emit(pm, 'OwnerAdded')
        .withArgs(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          FULL_OWNER_FLAG
        );

      expect(
        await pm.getFlags(pm.address, ADMIN_PERMISSION_ID, otherSigner.address)
      ).to.deep.equal([FULL_OWNER_FLAG, 0]);
    });

    it('should add an owner with only specific flags passed', async () => {
      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          GRANT_OWNER_FLAG
        )
      )
        .to.emit(pm, 'OwnerAdded')
        .withArgs(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          GRANT_OWNER_FLAG
        );

      expect(
        await pm.getFlags(pm.address, ADMIN_PERMISSION_ID, otherSigner.address)
      ).to.deep.equal([GRANT_OWNER_FLAG, 0]);

      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        )
      )
        .to.emit(pm, 'OwnerAdded')
        .withArgs(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        );

      expect(
        await pm.getFlags(pm.address, ADMIN_PERMISSION_ID, otherSigner.address)
      ).to.deep.equal([FULL_OWNER_FLAG, 0]);
    });

    it('should correctly increase owner counters', async () => {
      const newOwner = otherSigner.address;

      await pm.addOwner(
        pm.address,
        ADMIN_PERMISSION_ID,
        newOwner,
        GRANT_OWNER_FLAG
      );

      expect(
        await pm.getPermissionData(pm.address, ADMIN_PERMISSION_ID)
      ).to.deep.equal([true, 2, 1]);

      // If the same flag that `newOwner` already holds is added,
      // it shouldn't increase counts and neither emit the event
      await expect(
        pm.addOwner(pm.address, ADMIN_PERMISSION_ID, newOwner, GRANT_OWNER_FLAG)
      ).to.not.emit(pm, 'OwnerAdded');

      expect(
        await pm.getPermissionData(pm.address, ADMIN_PERMISSION_ID)
      ).to.deep.equal([true, 2, 1]);

      // Add the same owner but with revoke which should increase revoke counter only.
      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          newOwner,
          REVOKE_OWNER_FLAG
        )
      ).to.emit(pm, 'OwnerAdded');

      expect(
        await pm.getPermissionData(pm.address, ADMIN_PERMISSION_ID)
      ).to.deep.equal([true, 2, 2]);
    });

    it('should revert if a zero flag is passed', async () => {
      await expect(
        pm.addOwner(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, 0)
      ).to.be.revertedWithCustomError(pm, 'FlagCanNotBeZero');
    });

    it('should revert if an _owner passed is address(0)', async () => {
      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          ethers.constants.AddressZero,
          FULL_OWNER_FLAG
        )
      ).to.be.revertedWithCustomError(pm, 'ZeroAddress');
    });

    it('should revert if _where passed is address(0)', async () => {
      await expect(
        pm.addOwner(
          ethers.constants.AddressZero,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          FULL_OWNER_FLAG
        )
      ).to.be.revertedWithCustomError(pm, 'ZeroAddress');
    });

    it('should revert if the permission is frozen', async () => {
      const freezeAddr = FREEZE_ADDRESS;

      await pm.addOwner(
        pm.address,
        ADMIN_PERMISSION_ID,
        freezeAddr,
        FULL_OWNER_FLAG
      );

      await pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, FULL_OWNER_FLAG);

      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          FULL_OWNER_FLAG
        )
      )
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(pm.address, ADMIN_PERMISSION_ID);
    });

    it('should revert if the caller does not have ownership for revoke', async () => {
      const someAddress = await ethers.Wallet.createRandom().getAddress();

      await pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, REVOKE_OWNER_FLAG);

      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          someAddress,
          REVOKE_OWNER_FLAG
        )
      )
        .to.be.revertedWithCustomError(pm, 'UnauthorizedOwner')
        .withArgs(ownerSigner.address, GRANT_OWNER_FLAG, REVOKE_OWNER_FLAG);

      // Note that it should still have grant owner capability.
      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          someAddress,
          GRANT_OWNER_FLAG
        )
      ).to.not.be.reverted;
    });

    it('should revert if the caller does not have ownership for grant', async () => {
      const someAddress = await ethers.Wallet.createRandom().getAddress();

      await pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, GRANT_OWNER_FLAG);

      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          someAddress,
          GRANT_OWNER_FLAG
        )
      )
        .to.be.revertedWithCustomError(pm, 'UnauthorizedOwner')
        .withArgs(ownerSigner.address, REVOKE_OWNER_FLAG, GRANT_OWNER_FLAG);

      // Note that it should still have revoke owner capability.
      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          someAddress,
          REVOKE_OWNER_FLAG
        )
      ).to.not.be.reverted;
    });

    it('should not emit event if owner already holds the flags that is being added', async () => {
      const owner = signers[2];

      await pm.addOwner(
        pm.address,
        ADMIN_PERMISSION_ID,
        owner.address,
        FULL_OWNER_FLAG
      );

      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          owner.address,
          GRANT_OWNER_FLAG
        )
      ).to.not.emit(pm, 'OwnerAdded');
    });
  });

  describe('removeOwner', () => {
    beforeEach(async () => {
      await pm.createPermission(
        someWhere,
        ADMIN_PERMISSION_ID,
        ownerSigner.address,
        []
      );
    });

    it('should remove the FULL_OWNER_FLAGS from the owner', async () => {
      await expect(
        pm.removeOwner(someWhere, ADMIN_PERMISSION_ID, FULL_OWNER_FLAG)
      )
        .to.emit(pm, 'OwnerRemoved')
        .withArgs(someWhere, ADMIN_PERMISSION_ID, ownerSigner.address, 0, 0);

      expect(
        await pm.getFlags(someWhere, ADMIN_PERMISSION_ID, ownerSigner.address)
      ).to.deep.equal([0, 0]);
    });

    it('should remove the specific flag from the owner', async () => {
      await expect(
        pm.removeOwner(someWhere, ADMIN_PERMISSION_ID, GRANT_OWNER_FLAG)
      )
        .to.emit(pm, 'OwnerRemoved')
        .withArgs(
          someWhere,
          ADMIN_PERMISSION_ID,
          ownerSigner.address,
          REVOKE_OWNER_FLAG,
          0
        );

      expect(
        await pm.getFlags(someWhere, ADMIN_PERMISSION_ID, ownerSigner.address)
      ).to.deep.equal([REVOKE_OWNER_FLAG, 0]);

      await expect(
        pm.removeOwner(someWhere, ADMIN_PERMISSION_ID, REVOKE_OWNER_FLAG)
      )
        .to.emit(pm, 'OwnerRemoved')
        .withArgs(someWhere, ADMIN_PERMISSION_ID, ownerSigner.address, 0, 0);

      expect(
        await pm.getFlags(someWhere, ADMIN_PERMISSION_ID, ownerSigner.address)
      ).to.deep.equal([0, 0]);
    });

    it('should revert if a zero flag is passed', async () => {
      await expect(
        pm.removeOwner(someWhere, ADMIN_PERMISSION_ID, 0)
      ).to.be.revertedWithCustomError(pm, 'FlagCanNotBeZero');
    });

    it("should revert if flags that don't exist are removed", async () => {
      await pm.removeOwner(someWhere, ADMIN_PERMISSION_ID, GRANT_OWNER_FLAG);

      await expect(
        pm.removeOwner(someWhere, ADMIN_PERMISSION_ID, GRANT_OWNER_FLAG)
      )
        .to.be.revertedWithCustomError(pm, 'InvalidFlagsForRemovalPassed')
        .withArgs(REVOKE_OWNER_FLAG, GRANT_OWNER_FLAG);
    });

    it('should correctly decrease owner counters', async () => {
      expect(
        await pm.getPermissionData(someWhere, ADMIN_PERMISSION_ID)
      ).to.deep.equal([true, 1, 1]);

      const newOwner = otherSigner.address;

      await pm.addOwner(
        someWhere,
        ADMIN_PERMISSION_ID,
        newOwner,
        FULL_OWNER_FLAG
      );

      expect(
        await pm.getPermissionData(someWhere, ADMIN_PERMISSION_ID)
      ).to.deep.equal([true, 2, 2]);

      await pm
        .connect(otherSigner)
        .removeOwner(someWhere, ADMIN_PERMISSION_ID, GRANT_OWNER_FLAG);

      expect(
        await pm.getPermissionData(someWhere, ADMIN_PERMISSION_ID)
      ).to.deep.equal([true, 1, 2]);

      await pm
        .connect(otherSigner)
        .removeOwner(someWhere, ADMIN_PERMISSION_ID, REVOKE_OWNER_FLAG);

      expect(
        await pm.getPermissionData(someWhere, ADMIN_PERMISSION_ID)
      ).to.deep.equal([true, 1, 1]);
    });

    it('should also remove delegatee flags when removing the owner flags', async () => {
      const owner = signers[2];

      await pm.addOwner(
        someWhere,
        ADMIN_PERMISSION_ID,
        owner.address,
        FULL_OWNER_FLAG
      );

      await pm.delegatePermission(
        someWhere,
        ADMIN_PERMISSION_ID,
        owner.address,
        FULL_OWNER_FLAG
      );

      await expect(
        pm
          .connect(owner)
          .removeOwner(someWhere, ADMIN_PERMISSION_ID, REVOKE_OWNER_FLAG)
      )
        .to.emit(pm, 'OwnerRemoved')
        .withArgs(
          someWhere,
          ADMIN_PERMISSION_ID,
          owner.address,
          GRANT_OWNER_FLAG,
          GRANT_OWNER_FLAG
        );
    });
  });

  describe('createPermission', () => {
    it('should only be callable by the ROOT user', async () => {
      await expect(
        pm.createPermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          []
        )
      )
        .to.emit(pm, 'PermissionCreated')
        .withArgs(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, []);

      await expect(
        pm
          .connect(otherSigner)
          .createPermission(
            pm.address,
            ethers.utils.id('TEST_PERMISSION_1'),
            otherSigner.address,
            []
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );
    });

    it('should revert in case the permission is already existing', async () => {
      await pm.createPermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        otherSigner.address,
        []
      );

      await expect(
        pm.createPermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          []
        )
      ).to.be.revertedWithCustomError(pm, 'PermissionAlreadyCreated');
    });

    it('should create a permission and call grant for all whos passed', async () => {
      const someAddress = await ethers.Wallet.createRandom().getAddress();
      await expect(
        pm.createPermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          [someAddress]
        )
      )
        .to.emit(pm, 'PermissionCreated')
        .withArgs(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, [
          someAddress,
        ]);

      expect(
        await pm.isGranted(pm.address, someAddress, ADMIN_PERMISSION_ID, '0x')
      ).to.be.true;
    });

    it('should create a permission with an owner of full capability', async () => {
      const someAddress = await ethers.Wallet.createRandom().getAddress();
      await expect(
        pm.createPermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          [someAddress]
        )
      )
        .to.emit(pm, 'PermissionCreated')
        .withArgs(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, [
          someAddress,
        ]);

      expect(
        await pm.getFlags(pm.address, ADMIN_PERMISSION_ID, otherSigner.address)
      ).to.deep.equal([FULL_OWNER_FLAG, 0]);

      expect(
        await pm.getPermissionData(pm.address, ADMIN_PERMISSION_ID)
      ).to.deep.equal([true, 1, 1]);
    });
  });

  describe('delegatePermission', () => {
    beforeEach(async () => {
      await pm.createPermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        ownerSigner.address,
        []
      );
    });

    it('should revert if a zero flag is passed', async () => {
      await expect(
        pm.delegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          0
        )
      ).to.be.revertedWithCustomError(pm, 'FlagCanNotBeZero');
    });

    it('should revert if the permission is actually frozen', async () => {
      await pm.addOwner(
        pm.address,
        ADMIN_PERMISSION_ID,
        FREEZE_ADDRESS,
        FULL_OWNER_FLAG
      );
      await pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, FULL_OWNER_FLAG);

      await expect(
        pm.delegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          FULL_OWNER_FLAG
        )
      )
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(pm.address, ADMIN_PERMISSION_ID);
    });

    it('should revert if the caller is not the owner of the permission he/she wants to delegate', async () => {
      await expect(
        pm
          .connect(otherSigner)
          .delegatePermission(
            pm.address,
            ADMIN_PERMISSION_ID,
            otherSigner.address,
            FULL_OWNER_FLAG
          )
      )
        .to.be.revertedWithCustomError(pm, 'UnauthorizedOwner')
        .withArgs(otherSigner.address, 0, FULL_OWNER_FLAG);
    });

    it('should emit PermissionDelegated and correctly store the flags', async () => {
      await expect(
        pm.delegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          GRANT_OWNER_FLAG
        )
      )
        .to.emit(pm, 'PermissionDelegated')
        .withArgs(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          GRANT_OWNER_FLAG
        );

      expect(
        await pm.getFlags(pm.address, ADMIN_PERMISSION_ID, otherSigner.address)
      ).to.deep.equal([0, GRANT_OWNER_FLAG]);

      await expect(
        pm.delegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        )
      )
        .to.emit(pm, 'PermissionDelegated')
        .withArgs(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          FULL_OWNER_FLAG
        );

      expect(
        await pm.getFlags(pm.address, ADMIN_PERMISSION_ID, otherSigner.address)
      ).to.deep.equal([0, FULL_OWNER_FLAG]);
    });

    it('should not emit PermissionDelegated if the same flags are added', async () => {
      const delegatee = signers[2];

      await pm.delegatePermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        delegatee.address,
        FULL_OWNER_FLAG
      );

      await expect(
        pm.delegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          delegatee.address,
          GRANT_OWNER_FLAG
        )
      ).to.not.emit(pm, 'PermissionDelegated');
    });
  });

  describe('undelegatePermission', () => {
    beforeEach(async () => {
      await pm.createPermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        ownerSigner.address,
        []
      );

      await pm.delegatePermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        otherSigner.address,
        FULL_OWNER_FLAG
      );
    });

    it('should revert when a zero flag is passed', async () => {
      await expect(
        pm.undelegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          0
        )
      ).to.be.revertedWithCustomError(pm, 'FlagCanNotBeZero');
    });

    it('should revert if the caller is not the owner of the permission he/she wants to undelegate', async () => {
      await expect(
        pm
          .connect(otherSigner)
          .undelegatePermission(
            pm.address,
            ADMIN_PERMISSION_ID,
            otherSigner.address,
            FULL_OWNER_FLAG
          )
      )
        .to.be.revertedWithCustomError(pm, 'UnauthorizedOwner')
        .withArgs(otherSigner.address, 0, FULL_OWNER_FLAG);
    });

    it('should revert if flags to undelegate are not delegated', async () => {
      const bob = signers[3];
      await pm.delegatePermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        bob.address,
        GRANT_OWNER_FLAG
      );

      await expect(
        pm.undelegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          bob.address,
          FULL_OWNER_FLAG
        )
      )
        .to.be.revertedWithCustomError(pm, 'InvalidFlagsForRemovalPassed')
        .withArgs(GRANT_OWNER_FLAG, FULL_OWNER_FLAG);
    });

    it('should emit PermissionUndelegated and correctly update the flags', async () => {
      await expect(
        pm.undelegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        )
      )
        .to.emit(pm, 'PermissionUndelegated')
        .withArgs(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          GRANT_OWNER_FLAG
        );

      expect(
        await pm.getFlags(pm.address, ADMIN_PERMISSION_ID, otherSigner.address)
      ).to.deep.equal([0, GRANT_OWNER_FLAG]);
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

    it('reverts if permissionId is restricted and `_who == ANY_ADDR` or `_where == ANY_ADDR`', async () => {
      for (let i = 0; i < RESTRICTED_PERMISSIONS_FOR_ANY_ADDR.length; i++) {
        await expect(
          pm.grant(pm.address, ANY_ADDR, RESTRICTED_PERMISSIONS_FOR_ANY_ADDR[i])
        ).to.be.revertedWithCustomError(
          pm,
          'PermissionsForAnyAddressDisallowed'
        );
        await expect(
          pm.grant(ANY_ADDR, pm.address, RESTRICTED_PERMISSIONS_FOR_ANY_ADDR[i])
        ).to.be.revertedWithCustomError(
          pm,
          'PermissionsForAnyAddressDisallowed'
        );
      }
    });

    it('reverts if permissionId is not restricted and`_who == ANY_ADDR` or `_where == ANY_ADDR`', async () => {
      await expect(
        pm.grant(pm.address, ANY_ADDR, ADMIN_PERMISSION_ID)
      ).to.be.revertedWithCustomError(pm, 'PermissionsForAnyAddressDisallowed');

      await expect(
        pm.grant(ANY_ADDR, pm.address, ADMIN_PERMISSION_ID)
      ).to.be.revertedWithCustomError(pm, 'PermissionsForAnyAddressDisallowed');
    });

    it('reverts if special `APPLY_TARGET_PERMISSION_ID` is granted to non-allowed address', async () => {
      const allowedApplyTargetMethodGrantee =
        await pm.applyTargetMethodGrantee();

      await expect(
        pm.grant(pm.address, otherSigner.address, APPLY_TARGET_PERMISSION_ID)
      )
        .to.be.revertedWithCustomError(
          pm,
          'IncorrectApplyTargetMethodGranteeSet'
        )
        .withArgs(allowedApplyTargetMethodGrantee);

      // It should succeed if it's allowed.
      await pm.setApplyTargetMethodGrantee(otherSigner.address);

      await expect(
        pm.grant(pm.address, otherSigner.address, APPLY_TARGET_PERMISSION_ID)
      ).to.not.be.reverted;
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
        .withArgs(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
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

    it('should revert if the permission is frozen', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          ownerSigner.address,
        ]);

      await pm
        .connect(ownerSigner)
        .addOwner(
          someWhere,
          somePermissionId,
          FREEZE_ADDRESS,
          GRANT_OWNER_FLAG
        );

      await pm
        .connect(ownerSigner)
        .removeOwner(someWhere, somePermissionId, FULL_OWNER_FLAG);

      await expect(
        pm
          .connect(ownerSigner)
          .grant(someWhere, otherSigner.address, somePermissionId)
      )
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(someWhere, somePermissionId);
    });

    it('should revert if the caller does not have the grant flag set', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          otherSigner.address,
        ]);

      await expect(
        pm
          .connect(otherSigner)
          .grant(someWhere, otherSigner.address, somePermissionId)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(someWhere, otherSigner.address, somePermissionId);
    });

    it('should allow the root user as fallback if the permission is created but no grant owners are existing anymore', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, otherSigner.address, [
          ownerSigner.address,
        ]);

      await pm
        .connect(otherSigner)
        .removeOwner(someWhere, somePermissionId, GRANT_OWNER_FLAG);

      await expect(
        pm
          .connect(ownerSigner)
          .grant(someWhere, otherSigner.address, somePermissionId)
      ).to.emit(pm, 'Granted');
    });

    it('should allow the root user as fallback if the permission is not created', async () => {
      await expect(
        pm
          .connect(ownerSigner)
          .grant(someWhere, otherSigner.address, somePermissionId)
      ).to.emit(pm, 'Granted');
    });

    it('should allow the delegatee to call grant once', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          ownerSigner.address,
        ]);

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          otherSigner.address,
          GRANT_OWNER_FLAG
        );

      await expect(
        pm
          .connect(otherSigner)
          .grant(someWhere, otherSigner.address, somePermissionId)
      ).to.emit(pm, 'Granted');

      await expect(
        pm
          .connect(otherSigner)
          .grant(someWhere, otherSigner.address, somePermissionId)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(someWhere, otherSigner.address, somePermissionId);
    });

    it('should succeed if a caller is both delegated and an owner but holds different flags', async () => {
      let owner = signers[3];
      let alice = signers[4];

      await pm.createPermission(someWhere, somePermissionId, owner.address, []);

      // Alice became a delegate of `GRANT_OWNER_FLAG` on this permission
      await pm
        .connect(owner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          alice.address,
          REVOKE_OWNER_FLAG
        );
      await pm
        .connect(owner)
        .addOwner(someWhere, somePermissionId, alice.address, GRANT_OWNER_FLAG);

      await pm.connect(alice).grant(someWhere, someWhere, somePermissionId);
      await pm.connect(alice).revoke(someWhere, someWhere, somePermissionId);
    });

    it('should still keep the flag for delegation if a caller is an owner and delegate and calls grant', async () => {
      let owner = signers[4];

      await pm.createPermission(someWhere, somePermissionId, owner.address, []);

      await pm
        .connect(owner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          owner.address,
          GRANT_OWNER_FLAG
        );

      await pm.connect(owner).grant(someWhere, someWhere, somePermissionId);

      expect(
        await pm.getFlags(someWhere, somePermissionId, owner.address)
      ).to.deep.equal([FULL_OWNER_FLAG, GRANT_OWNER_FLAG]);
    });

    it('should still keep `REVOKE_OWNER_FLAG` for delegatee if only `GRANT_OWNER_FLAG` is used/depleted', async () => {
      let owner = signers[3];
      let alice = signers[4];

      await pm.createPermission(someWhere, somePermissionId, owner.address, []);

      // Alice became a delegate of `GRANT_OWNER_FLAG` on this permission
      await pm
        .connect(owner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          alice.address,
          FULL_OWNER_FLAG
        );

      await pm.connect(alice).grant(someWhere, someWhere, somePermissionId);

      let currentFlags = await pm.getFlags(
        someWhere,
        somePermissionId,
        alice.address
      );
      expect(currentFlags).to.deep.equal([0, REVOKE_OWNER_FLAG]);
      await expect(
        pm.connect(alice).revoke(someWhere, someWhere, somePermissionId)
      ).to.not.be.reverted;
    });

    it('should revert if undelegate got called before grantWithCondition got called by the delegatee', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          otherSigner.address,
        ]);

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        );

      await pm
        .connect(ownerSigner)
        .undelegatePermission(
          someWhere,
          somePermissionId,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        );

      await expect(
        pm
          .connect(otherSigner)
          .grant(someWhere, otherSigner.address, somePermissionId)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(someWhere, otherSigner.address, somePermissionId);
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

    it('reverts if special `APPLY_TARGET_PERMISSION_ID` is granted to non-allowed address', async () => {
      const allowedApplyTargetMethodGrantee =
        await pm.applyTargetMethodGrantee();

      await expect(
        pm.grantWithCondition(
          pm.address,
          otherSigner.address,
          APPLY_TARGET_PERMISSION_ID,
          conditionMock.address
        )
      )
        .to.be.revertedWithCustomError(
          pm,
          'IncorrectApplyTargetMethodGranteeSet'
        )
        .withArgs(allowedApplyTargetMethodGrantee);

      // It should succeed if it's allowed.
      await pm.setApplyTargetMethodGrantee(otherSigner.address);

      await expect(
        pm.grantWithCondition(
          pm.address,
          otherSigner.address,
          APPLY_TARGET_PERMISSION_ID,
          conditionMock.address
        )
      ).to.not.be.reverted;
    });

    it('reverts if both `_who == ANY_ADDR` and `_where == ANY_ADDR', async () => {
      await expect(
        pm.grantWithCondition(
          ANY_ADDR,
          ANY_ADDR,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID,
          conditionMock.address
        )
      ).to.be.revertedWithCustomError(pm, 'AnyAddressDisallowedForWhoAndWhere');
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
        .withArgs(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
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

    it('should revert if the permission is frozen', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          ownerSigner.address,
        ]);

      await pm
        .connect(ownerSigner)
        .addOwner(
          someWhere,
          somePermissionId,
          FREEZE_ADDRESS,
          GRANT_OWNER_FLAG
        );

      await pm
        .connect(ownerSigner)
        .removeOwner(someWhere, somePermissionId, FULL_OWNER_FLAG);

      await expect(
        pm
          .connect(ownerSigner)
          .grantWithCondition(
            someWhere,
            otherSigner.address,
            somePermissionId,
            conditionMock.address
          )
      )
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(someWhere, somePermissionId);
    });

    it('should revert if the caller doesnt have the grantWithCondition flag set', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          otherSigner.address,
        ]);

      await expect(
        pm
          .connect(otherSigner)
          .grantWithCondition(
            someWhere,
            otherSigner.address,
            somePermissionId,
            conditionMock.address
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(someWhere, otherSigner.address, somePermissionId);
    });

    it('should allow the root user as fallback if the permission is created but no grantWithCondition owners are existing anymore', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, otherSigner.address, [
          ownerSigner.address,
        ]);

      await pm
        .connect(otherSigner)
        .removeOwner(someWhere, somePermissionId, GRANT_OWNER_FLAG);

      await expect(
        pm
          .connect(ownerSigner)
          .grantWithCondition(
            someWhere,
            otherSigner.address,
            somePermissionId,
            conditionMock.address
          )
      ).to.emit(pm, 'Granted');
    });

    it('should allow the root user as fallback if the permission isnt created', async () => {
      await expect(
        pm
          .connect(ownerSigner)
          .grantWithCondition(
            someWhere,
            otherSigner.address,
            somePermissionId,
            conditionMock.address
          )
      ).to.emit(pm, 'Granted');
    });

    it('should allow the delegatee to call grantWithCondition once', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          ownerSigner.address,
        ]);

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          otherSigner.address,
          GRANT_OWNER_FLAG
        );

      await expect(
        pm
          .connect(otherSigner)
          .grantWithCondition(
            someWhere,
            otherSigner.address,
            somePermissionId,
            conditionMock.address
          )
      ).to.emit(pm, 'Granted');

      await expect(
        pm
          .connect(otherSigner)
          .grantWithCondition(
            someWhere,
            otherSigner.address,
            somePermissionId,
            conditionMock.address
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(someWhere, otherSigner.address, somePermissionId);
    });

    it('should revert if undelegate got called before grantWithCondition got called by the delegatee', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          otherSigner.address,
        ]);

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        );

      await pm
        .connect(ownerSigner)
        .undelegatePermission(
          someWhere,
          somePermissionId,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        );

      await expect(
        pm
          .connect(otherSigner)
          .grantWithCondition(
            someWhere,
            otherSigner.address,
            somePermissionId,
            conditionMock.address
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(someWhere, otherSigner.address, somePermissionId);
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
        .withArgs(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
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
        .withArgs(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
    });

    it('should not allow for non ROOT', async () => {
      await pm.grant(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
      await expect(
        pm
          .connect(otherSigner)
          .revoke(pm.address, otherSigner.address, ADMIN_PERMISSION_ID)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(pm.address, otherSigner.address, ADMIN_PERMISSION_ID);
    });

    it('should revert if the permission is frozen', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          ownerSigner.address,
        ]);

      await pm
        .connect(ownerSigner)
        .addOwner(
          someWhere,
          somePermissionId,
          FREEZE_ADDRESS,
          GRANT_OWNER_FLAG
        );

      await pm
        .connect(ownerSigner)
        .removeOwner(someWhere, somePermissionId, FULL_OWNER_FLAG);

      await expect(
        pm
          .connect(ownerSigner)
          .revoke(someWhere, otherSigner.address, somePermissionId)
      )
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(someWhere, somePermissionId);
    });

    it('should revert if the caller doesnt have the revoke flag set', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          otherSigner.address,
        ]);

      await expect(
        pm
          .connect(otherSigner)
          .revoke(someWhere, otherSigner.address, somePermissionId)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(someWhere, otherSigner.address, somePermissionId);
    });

    it('should allow the root user as fallback if the permission is created but no revoke owners are existing anymore', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, otherSigner.address, [
          otherSigner.address,
        ]);

      await pm
        .connect(otherSigner)
        .removeOwner(someWhere, somePermissionId, REVOKE_OWNER_FLAG);

      await expect(
        pm
          .connect(ownerSigner)
          .revoke(someWhere, otherSigner.address, somePermissionId)
      ).to.emit(pm, 'Revoked');
    });

    it('should allow the root user as fallback if the permission isnt created', async () => {
      await pm
        .connect(ownerSigner)
        .grant(someWhere, otherSigner.address, somePermissionId);

      await expect(
        pm
          .connect(ownerSigner)
          .revoke(someWhere, otherSigner.address, somePermissionId)
      ).to.emit(pm, 'Revoked');
    });

    it('should allow the delegatee to call revoke once', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          otherSigner.address,
        ]);

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        );

      await expect(
        pm
          .connect(otherSigner)
          .revoke(someWhere, otherSigner.address, somePermissionId)
      ).to.emit(pm, 'Revoked');

      await expect(
        pm
          .connect(otherSigner)
          .revoke(someWhere, otherSigner.address, somePermissionId)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(someWhere, otherSigner.address, somePermissionId);
    });

    it('should still keep the flag for delegation if a caller is an owner and delegate and calls revoke', async () => {
      let owner = signers[4];

      await pm.createPermission(someWhere, somePermissionId, owner.address, []);

      await pm
        .connect(owner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          owner.address,
          REVOKE_OWNER_FLAG
        );

      await pm.connect(owner).revoke(someWhere, someWhere, somePermissionId);

      expect(
        await pm.getFlags(someWhere, somePermissionId, owner.address)
      ).to.deep.equal([FULL_OWNER_FLAG, REVOKE_OWNER_FLAG]);
    });

    it('should still keep `GRANT_OWNER_FLAG` for delegatee if only `REVOKE_OWNER_FLAG` is used/depleted', async () => {
      let owner = signers[3];
      let alice = signers[4];

      await pm.createPermission(someWhere, somePermissionId, owner.address, []);

      // Alice became a delegate of `GRANT_OWNER_FLAG` on this permission
      await pm
        .connect(owner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          alice.address,
          FULL_OWNER_FLAG
        );

      await pm.connect(alice).revoke(someWhere, someWhere, somePermissionId);

      let currentFlags = await pm.getFlags(
        someWhere,
        somePermissionId,
        alice.address
      );
      expect(currentFlags).to.deep.equal([0, GRANT_OWNER_FLAG]);
      await expect(
        pm.connect(alice).grant(someWhere, someWhere, somePermissionId)
      ).to.not.be.reverted;
    });

    it('should revert if undelegate got called before revoke got called by the delegatee', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(someWhere, somePermissionId, ownerSigner.address, [
          otherSigner.address,
        ]);

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          someWhere,
          somePermissionId,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        );

      await pm
        .connect(ownerSigner)
        .undelegatePermission(
          someWhere,
          somePermissionId,
          otherSigner.address,
          REVOKE_OWNER_FLAG
        );

      await expect(
        pm
          .connect(otherSigner)
          .revoke(someWhere, otherSigner.address, somePermissionId)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(someWhere, otherSigner.address, somePermissionId);
    });
  });

  describe('setApplyTargetMethodGrantee', () => {
    beforeEach(async () => {
      await pm.createPermission(
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        otherSigner.address,
        ['0xb794F5eA0ba39494cE839613fffBA74279579268']
      );
    });

    it('should store the applyTargetMethodGrantee ', async () => {
      expect(await pm.applyTargetMethodGrantee()).to.be.equal(addressZero);
      await pm.setApplyTargetMethodGrantee(ownerSigner.address);

      expect(await pm.applyTargetMethodGrantee()).to.be.equal(
        ownerSigner.address
      );
    });

    it('should emit ApplyTargetMethodGranteeSet', async () => {
      await expect(pm.setApplyTargetMethodGrantee(ownerSigner.address)).to.emit(
        pm,
        'ApplyTargetMethodGranteeSet'
      );
    });

    it('should revert if not allowed', async () => {
      await expect(
        pm.connect(otherSigner).setApplyTargetMethodGrantee(ownerSigner.address)
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
    let bulkItem: MultiTargetPermission;

    before(async () => {
      bulkItem = {
        operation: Operation.Grant,
        where: someWhere,
        who: someWhere,
        condition: addressZero,
        permissionId: ADMIN_PERMISSION_ID,
      };
    });

    it("throws `Unauthorized` error when caller does not have `APPLY_TARGET_PERMISSION` and isn't root", async () => {
      let caller = signers[3];

      await expect(pm.connect(caller).applyMultiTargetPermissions([bulkItem]))
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(pm.address, caller.address, APPLY_TARGET_PERMISSION_ID);
    });

    it('should bulk grant multiple permissions', async () => {
      const items: MultiTargetPermission[] = [
        {
          operation: Operation.Grant,
          where: signers[1].address,
          who: signers[2].address,
          condition: addressZero,
          permissionId: ethers.utils.id('TEST_PERMISSION_1'),
        },
        {
          operation: Operation.Grant,
          where: signers[3].address,
          who: signers[4].address,
          condition: addressZero,
          permissionId: ethers.utils.id('TEST_PERMISSION_2'),
        },
      ];

      await pm.applyMultiTargetPermissions(items);
      for (const item of items) {
        const permission = await pm.getAuthPermission(
          item.where,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(ALLOW_FLAG);
      }
    });

    describe('When permission does not have an owner', async () => {
      it('should succeed if caller has ROOT', async () => {
        let caller = signers[2];

        await pm.grant(
          pm.address,
          caller.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );

        await expect(
          pm.connect(caller).applyMultiTargetPermissions([bulkItem])
        ).to.emit(pm, 'Granted');

        const permission = await pm.getAuthPermission(
          bulkItem.where,
          bulkItem.who,
          bulkItem.permissionId
        );

        expect(permission).to.be.equal(ALLOW_FLAG);
      });

      it('should succeed if caller has `APPLY_TARGET_PERMISSION`', async () => {
        let caller = signers[2];

        await pm.setApplyTargetMethodGrantee(caller.address);
        await pm.grant(pm.address, caller.address, APPLY_TARGET_PERMISSION_ID);

        await expect(
          pm.connect(caller).applyMultiTargetPermissions([bulkItem])
        ).to.emit(pm, 'Granted');

        const permission = await pm.getAuthPermission(
          bulkItem.where,
          bulkItem.who,
          bulkItem.permissionId
        );

        expect(permission).to.be.equal(ALLOW_FLAG);
      });
    });

    describe('When permission has an owner', async () => {
      it('should revert if caller has `APPLY_TARGET_PERMISSION but is not an owner', async () => {
        let owner = signers[3];
        let caller = signers[2];

        await pm.createPermission(
          someWhere,
          ADMIN_PERMISSION_ID,
          owner.address,
          []
        );

        await pm.setApplyTargetMethodGrantee(caller.address);
        await pm.grant(pm.address, caller.address, APPLY_TARGET_PERMISSION_ID);

        await expect(
          pm.connect(caller).applyMultiTargetPermissions([bulkItem])
        ).to.be.revertedWithCustomError(pm, 'Unauthorized');
      });

      it('should revert if caller has `ROOT` but is not an owner', async () => {
        let caller = signers[2];
        let owner = signers[3];

        await pm.createPermission(
          someWhere,
          ADMIN_PERMISSION_ID,
          owner.address,
          []
        );

        await pm.grant(
          pm.address,
          caller.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );

        await expect(
          pm.connect(caller).applyMultiTargetPermissions([bulkItem])
        ).to.be.revertedWithCustomError(pm, 'Unauthorized');
      });

      it('should succeed if caller has `APPLY_TARGET_PERMISSION` and is an owner', async () => {
        let caller = signers[3];

        await pm.createPermission(
          someWhere,
          ADMIN_PERMISSION_ID,
          caller.address,
          []
        );

        await pm.setApplyTargetMethodGrantee(caller.address);
        await pm.grant(pm.address, caller.address, APPLY_TARGET_PERMISSION_ID);

        await expect(
          pm.connect(caller).applyMultiTargetPermissions([bulkItem])
        ).to.emit(pm, 'Granted');

        const permission = await pm.getAuthPermission(
          bulkItem.where,
          bulkItem.who,
          bulkItem.permissionId
        );

        expect(permission).to.be.equal(ALLOW_FLAG);
      });

      it('should succeed if caller has `ROOT` and is an owner', async () => {
        let caller = signers[3];

        await pm.createPermission(
          someWhere,
          ADMIN_PERMISSION_ID,
          caller.address,
          []
        );

        await pm.grant(
          pm.address,
          caller.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );

        await expect(
          pm.connect(caller).applyMultiTargetPermissions([bulkItem])
        ).to.emit(pm, 'Granted');

        const permission = await pm.getAuthPermission(
          bulkItem.where,
          bulkItem.who,
          bulkItem.permissionId
        );

        expect(permission).to.be.equal(ALLOW_FLAG);
      });

      it('should succeed if caller is delegated', async () => {
        let caller = signers[3];
        let owner = signers[2];

        await pm.createPermission(
          someWhere,
          ADMIN_PERMISSION_ID,
          owner.address,
          []
        );

        await pm.grant(
          pm.address,
          caller.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );

        await expect(
          pm.connect(caller).applyMultiTargetPermissions([bulkItem])
        ).to.be.revertedWithCustomError(pm, 'Unauthorized');

        await pm
          .connect(owner)
          .delegatePermission(
            someWhere,
            ADMIN_PERMISSION_ID,
            caller.address,
            GRANT_OWNER_FLAG
          );

        await expect(
          pm.connect(caller).applyMultiTargetPermissions([bulkItem])
        ).to.emit(pm, 'Granted');
      });
    });

    it('should bulk revoke', async () => {
      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.Revoke,
          where: otherSigner.address,
          who: ownerSigner.address,
          condition: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Revoke,
          where: otherSigner.address,
          who: ownerSigner.address,
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

    it('should grant with condition', async () => {
      const conditionMock2 = await new PermissionConditionMock__factory(
        signers[0]
      ).deploy();

      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.GrantWithCondition,
          where: signers[3].address,
          who: signers[3].address,
          condition: conditionMock2.address,
          permissionId: ethers.utils.id('TEST_PERMISSION_1'),
        },
        {
          operation: Operation.GrantWithCondition,
          where: signers[4].address,
          who: signers[4].address,
          condition: conditionMock2.address,
          permissionId: ethers.utils.id('TEST_PERMISSION_2'),
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

    it('should revert if at least one of the permission is frozen', async () => {
      const permissionId1 = ethers.utils.id('TEST_PERMISSION_1');
      const permissionId2 = ethers.utils.id('TEST_PERMISSION_2');

      const where = someWhere;

      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.Grant,
          where: where,
          who: otherSigner.address,
          condition: addressZero,
          permissionId: permissionId1,
        },
        {
          operation: Operation.Grant,
          where: where,
          who: otherSigner.address,
          condition: addressZero,
          permissionId: permissionId2,
        },
      ];

      // Let's freeze one of the permission.
      await pm.createPermission(where, permissionId2, ownerSigner.address, []);
      await pm.addOwner(where, permissionId2, FREEZE_ADDRESS, FULL_OWNER_FLAG);
      await pm.removeOwner(where, permissionId2, FULL_OWNER_FLAG);

      // make sure that permission is really frozen.
      expect(await pm.isPermissionFrozen(where, permissionId2)).to.be.true;

      await expect(pm.applyMultiTargetPermissions(bulkItems))
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(where, permissionId2);
    });
  });

  describe('bulk on single target', () => {
    let bulkItem: SingleTargetPermission;

    before(async () => {
      bulkItem = {
        operation: Operation.Grant,
        who: someWhere,
        permissionId: ADMIN_PERMISSION_ID,
      };
    });

    it('throws `Unauthorized` error when caller does not have `APPLY_TARGET_PERMISSION` and isnt root', async () => {
      let caller = signers[3];

      await expect(
        pm.connect(caller).applySingleTargetPermissions(someWhere, [bulkItem])
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(pm.address, caller.address, APPLY_TARGET_PERMISSION_ID);
    });

    it('should bulk grant multiple permissions', async () => {
      const items: MultiTargetPermission[] = [
        {
          operation: Operation.Grant,
          who: signers[1].address,
          permissionId: ethers.utils.id('TEST_PERMISSION_1'),
        },
        {
          operation: Operation.Grant,
          who: signers[2].address,
          permissionId: ethers.utils.id('TEST_PERMISSION_2'),
        },
      ];

      await pm.applySingleTargetPermissions(someWhere, items);
      for (const item of items) {
        const permission = await pm.getAuthPermission(
          someWhere,
          item.who,
          item.permissionId
        );
        expect(permission).to.be.equal(ALLOW_FLAG);
      }
    });

    describe('When permission does not have an owner', async () => {
      it('should succeed if caller has ROOT', async () => {
        let caller = signers[2];

        await pm.grant(
          pm.address,
          caller.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );

        await expect(
          pm.connect(caller).applySingleTargetPermissions(someWhere, [bulkItem])
        ).to.emit(pm, 'Granted');

        const permission = await pm.getAuthPermission(
          someWhere,
          bulkItem.who,
          bulkItem.permissionId
        );

        expect(permission).to.be.equal(ALLOW_FLAG);
      });

      it('should succeed if caller has `APPLY_TARGET_PERMISSION`', async () => {
        let caller = signers[2];

        await pm.setApplyTargetMethodGrantee(caller.address);
        await pm.grant(pm.address, caller.address, APPLY_TARGET_PERMISSION_ID);

        await expect(
          pm.connect(caller).applySingleTargetPermissions(someWhere, [bulkItem])
        ).to.emit(pm, 'Granted');

        const permission = await pm.getAuthPermission(
          someWhere,
          bulkItem.who,
          bulkItem.permissionId
        );

        expect(permission).to.be.equal(ALLOW_FLAG);
      });
    });

    describe('When permission has an owner', async () => {
      it('should revert if caller has `APPLY_TARGET_PERMISSION but is not an owner', async () => {
        let owner = signers[3];
        let caller = signers[2];

        await pm.createPermission(
          someWhere,
          ADMIN_PERMISSION_ID,
          owner.address,
          []
        );

        await pm.setApplyTargetMethodGrantee(caller.address);
        await pm.grant(pm.address, caller.address, APPLY_TARGET_PERMISSION_ID);

        await expect(
          pm.connect(caller).applySingleTargetPermissions(someWhere, [bulkItem])
        ).to.be.revertedWithCustomError(pm, 'Unauthorized');
      });

      it('should revert if caller has `ROOT` but is not an owner', async () => {
        let owner = signers[3];
        let caller = signers[2];

        await pm.createPermission(
          someWhere,
          ADMIN_PERMISSION_ID,
          owner.address,
          []
        );

        await pm.grant(
          pm.address,
          caller.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );

        await expect(
          pm.connect(caller).applySingleTargetPermissions(someWhere, [bulkItem])
        ).to.be.revertedWithCustomError(pm, 'Unauthorized');
      });

      it('should succeed if caller has `APPLY_TARGET_PERMISSION` and is an owner', async () => {
        let caller = signers[3];

        await pm.createPermission(
          someWhere,
          ADMIN_PERMISSION_ID,
          caller.address,
          []
        );

        await pm.setApplyTargetMethodGrantee(caller.address);
        await pm.grant(pm.address, caller.address, APPLY_TARGET_PERMISSION_ID);

        await expect(
          pm.connect(caller).applySingleTargetPermissions(someWhere, [bulkItem])
        ).to.emit(pm, 'Granted');

        const permission = await pm.getAuthPermission(
          someWhere,
          bulkItem.who,
          bulkItem.permissionId
        );

        expect(permission).to.be.equal(ALLOW_FLAG);
      });

      it('should succeed if caller has `ROOT` and is an owner', async () => {
        let caller = signers[3];

        await pm.createPermission(
          someWhere,
          ADMIN_PERMISSION_ID,
          caller.address,
          []
        );

        await pm.grant(
          pm.address,
          caller.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );

        await expect(
          pm.connect(caller).applySingleTargetPermissions(someWhere, [bulkItem])
        ).to.emit(pm, 'Granted');

        const permission = await pm.getAuthPermission(
          someWhere,
          bulkItem.who,
          bulkItem.permissionId
        );

        expect(permission).to.be.equal(ALLOW_FLAG);
      });

      it('should succeed if caller is delegated', async () => {
        let caller = signers[3];
        let owner = signers[2];

        await pm.createPermission(
          someWhere,
          ADMIN_PERMISSION_ID,
          owner.address,
          []
        );

        await pm.grant(
          pm.address,
          caller.address,
          DAO_PERMISSIONS.ROOT_PERMISSION_ID
        );

        await expect(
          pm.connect(caller).applySingleTargetPermissions(someWhere, [bulkItem])
        ).to.be.revertedWithCustomError(pm, 'Unauthorized');

        await pm
          .connect(owner)
          .delegatePermission(
            someWhere,
            ADMIN_PERMISSION_ID,
            caller.address,
            GRANT_OWNER_FLAG
          );

        await expect(
          pm.connect(caller).applySingleTargetPermissions(someWhere, [bulkItem])
        ).to.emit(pm, 'Granted');
      });
    });

    it('reverts for `Operation.GrantWithCondition` ', async () => {
      const bulkItems: SingleTargetPermission[] = [
        {
          operation: Operation.GrantWithCondition,
          who: ownerSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];
      await expect(
        pm.applySingleTargetPermissions(pm.address, bulkItems)
      ).to.be.revertedWithCustomError(pm, 'GrantWithConditionNotSupported');
    });

    it('should revert if at least one of the permission is frozen', async () => {
      const permissionId1 = ethers.utils.id('TEST_PERMISSION_1');
      const permissionId2 = ethers.utils.id('TEST_PERMISSION_2');

      const where = someWhere;

      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.Grant,
          who: otherSigner.address,
          condition: addressZero,
          permissionId: permissionId1,
        },
        {
          operation: Operation.Grant,
          who: otherSigner.address,
          condition: addressZero,
          permissionId: permissionId2,
        },
      ];

      // Let's freeze one of the permission.
      await pm.createPermission(where, permissionId2, ownerSigner.address, []);
      await pm.addOwner(where, permissionId2, FREEZE_ADDRESS, FULL_OWNER_FLAG);
      await pm.removeOwner(where, permissionId2, FULL_OWNER_FLAG);

      // make sure that permission is really frozen.
      expect(await pm.isPermissionFrozen(where, permissionId2)).to.be.true;

      await expect(pm.applySingleTargetPermissions(where, bulkItems))
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(where, permissionId2);
    });

    it('should handle bulk mixed', async () => {
      await pm.createPermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        ownerSigner.address,
        [otherSigner.address]
      );

      const permissionId1 = ethers.utils.id('TEST_PERMISSION_1');
      const permissionId2 = ethers.utils.id('TEST_PERMISSION_2');

      const bulkItems: SingleTargetPermission[] = [
        {
          operation: Operation.Revoke,
          who: otherSigner.address,
          permissionId: permissionId1,
        },
        {
          operation: Operation.Grant,
          who: ownerSigner.address,
          permissionId: permissionId2,
        },
      ];

      await pm.applySingleTargetPermissions(pm.address, bulkItems);
      expect(
        await pm.getAuthPermission(
          pm.address,
          otherSigner.address,
          permissionId1
        )
      ).to.be.equal(UNSET_FLAG);
      expect(
        await pm.getAuthPermission(
          pm.address,
          ownerSigner.address,
          permissionId2
        )
      ).to.be.equal(ALLOW_FLAG);
    });

    it('should emit correct events on bulk', async () => {
      await pm.grant(pm.address, ownerSigner.address, ADMIN_PERMISSION_ID);
      const bulkItems: SingleTargetPermission[] = [
        {
          operation: Operation.Revoke,
          who: ownerSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          who: ownerSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];

      await expect(pm.applySingleTargetPermissions(pm.address, bulkItems))
        .to.emit(pm, 'Revoked')
        .withArgs(
          ADMIN_PERMISSION_ID,
          ownerSigner.address,
          pm.address,
          ownerSigner.address
        )
        .to.emit(pm, 'Granted')
        .withArgs(
          ADMIN_PERMISSION_ID,
          ownerSigner.address,
          pm.address,
          ownerSigner.address,
          ALLOW_FLAG
        );
      expect(
        await pm.getAuthPermission(
          pm.address,
          ownerSigner.address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(ALLOW_FLAG);
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
