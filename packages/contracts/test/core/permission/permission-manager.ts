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
const APPLY_TARGET_PERMISSION_ID = ethers.utils.id(
  'APPLY_TARGET_PERMISSION_ID'
);
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

  describe('addOwner', () => {
    beforeEach(async () => {
      await pm.createPermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        ownerSigner.address,
        ['0xb794f5ea0ba39494ce839613fffba74279579268']
      );
    });

    it('should add an owner with all the flags passed', async () => {
      await expect(
        pm.addOwner(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, 6)
      )
        .to.emit(pm, 'OwnerAdded')
        .withArgs(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, 6);
    });

    it('should revert with FlagCanNotBeZero if a zero flag is passed', async () => {
      await expect(
        pm.addOwner(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, 0)
      ).to.be.revertedWithCustomError(pm, 'FlagCanNotBeZero');
    });

    it('should revert with ZeroAddress if _owner is address(0)', async () => {
      await expect(
        pm.addOwner(
          pm.address,
          ADMIN_PERMISSION_ID,
          '0x0000000000000000000000000000000000000000',
          6
        )
      ).to.be.revertedWithCustomError(pm, 'ZeroAddress');
    });

    it('should revert with ZeroAddress if _where is address(0)', async () => {
      await expect(
        pm.addOwner(
          '0x0000000000000000000000000000000000000000',
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          6
        )
      ).to.be.revertedWithCustomError(pm, 'ZeroAddress');
    });

    it('should revert with PermissionFrozen if the permission is frozen', async () => {
      await pm.addOwner(
        pm.address,
        ADMIN_PERMISSION_ID,
        '0x0000000000000000000000000000000000000001',
        6
      );

      await pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, 6);

      await expect(
        pm.addOwner(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, 6)
      )
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(pm.address, ADMIN_PERMISSION_ID);
    });

    it('should revert with UnauthorizedOwner if the caller doesnt have ownership for revoke', async () => {
      await pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, 4);

      await expect(
        pm.addOwner(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, 4)
      )
        .to.be.revertedWithCustomError(pm, 'UnauthorizedOwner')
        .withArgs(ownerSigner.address, 2, 4);
    });

    it('should revert with UnauthorizedOwner if the caller doesnt have ownership for grant', async () => {
      await pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, 2);

      await expect(
        pm.addOwner(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, 2)
      )
        .to.be.revertedWithCustomError(pm, 'UnauthorizedOwner')
        .withArgs(ownerSigner.address, 4, 2);
    });
  });

  describe('removeOwner', () => {
    beforeEach(async () => {
      await pm.createPermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        ownerSigner.address,
        ['0xb794f5ea0ba39494ce839613fffba74279579268']
      );
    });

    /*it('should remove the passed flags from the owner', async () => {
      await expect(pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, 6))
        .to.emit(pm.address, 'OwnerRemoved')
        .withArgs(pm.address, ADMIN_PERMISSION_ID, ownerSigner.address, 1);
    });*/

    it('should revert with FlagCanNotBeZero if a zero flag is passed', async () => {
      await expect(
        pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, 0)
      ).to.be.revertedWithCustomError(pm, 'FlagCanNotBeZero');
    });

    it('should revert with InvalidFlagsForRemovalPassed if flags are tried to be removed that do not exist', async () => {
      await pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, 2);

      await expect(pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, 2))
        .to.be.revertedWithCustomError(pm, 'InvalidFlagsForRemovalPassed')
        .withArgs(4, 2);
    });
  });

  describe('createPermission', () => {
    it('should only be callable by the ROOT user', async () => {
      await expect(
        pm.createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000000001234',
          otherSigner.address,
          ['0xb794f5ea0ba39494ce839613fffba74279579268']
        )
      )
        .to.emit(pm, 'PermissionCreated')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          '0x0000000000000000000000000000000000000000000000000000000000001234',
          otherSigner.address,
          ['0xb794F5eA0ba39494cE839613fffBA74279579268']
        );

      await expect(
        pm
          .connect(otherSigner)
          .createPermission(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            '0x0000000000000000000000000000000000000000000000000000000000001234',
            otherSigner.address,
            ['0xb794f5ea0ba39494ce839613fffba74279579268']
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          pm.address,
          otherSigner.address,
          '0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33'
        );
    });

    it('should revert with PermissionAlreadyCreated in case the permission is already existing', async () => {
      await expect(
        pm.createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000000001234',
          otherSigner.address,
          ['0xb794f5ea0ba39494ce839613fffba74279579268']
        )
      )
        .to.emit(pm, 'PermissionCreated')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          '0x0000000000000000000000000000000000000000000000000000000000001234',
          otherSigner.address,
          ['0xb794F5eA0ba39494cE839613fffBA74279579268']
        );

      await expect(
        pm.createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000000001234',
          otherSigner.address,
          ['0xb794f5ea0ba39494ce839613fffba74279579268']
        )
      ).to.be.revertedWithCustomError(pm, 'PermissionAlreadyCreated');
    });

    it('should create a permission and call grant for all whos passed', async () => {
      await expect(
        pm.createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000000001234',
          otherSigner.address,
          ['0xb794f5ea0ba39494ce839613fffba74279579268']
        )
      )
        .to.emit(pm, 'PermissionCreated')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          '0x0000000000000000000000000000000000000000000000000000000000001234',
          otherSigner.address,
          ['0xb794F5eA0ba39494cE839613fffBA74279579268']
        );

      const flag = await pm.getAuthPermission(
        '0xb794f5ea0ba39494ce839613fffba74279579268',
        '0xb794f5ea0ba39494ce839613fffba74279579268',
        '0x0000000000000000000000000000000000000000000000000000000000001234'
      );

      expect(flag).to.equal('0x0000000000000000000000000000000000000002');
    });
  });

  describe('delegatePermission', () => {
    beforeEach(async () => {
      await pm.createPermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        ownerSigner.address,
        ['0xb794f5ea0ba39494ce839613fffba74279579268']
      );
    });

    it('should revert with FlagCanNotBeZero if a zero flag is passed', async () => {
      await expect(
        pm.delegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          0
        )
      ).to.be.revertedWithCustomError(pm, 'FlagCanNotBeZero');
    });

    it('should revert with PermissionFrozen if the permission is actually frozen', async () => {
      await pm.addOwner(
        pm.address,
        ADMIN_PERMISSION_ID,
        '0x0000000000000000000000000000000000000001',
        6
      );
      await pm.removeOwner(pm.address, ADMIN_PERMISSION_ID, 6);

      await expect(
        pm.delegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          6
        )
      )
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(pm.address, ADMIN_PERMISSION_ID);
    });

    it('should revert with UnauthorizedOwner if the caller isnt the owner of the permission he wants to delegate', async () => {
      await expect(
        pm
          .connect(otherSigner)
          .delegatePermission(
            pm.address,
            ADMIN_PERMISSION_ID,
            otherSigner.address,
            6
          )
      )
        .to.be.revertedWithCustomError(pm, 'UnauthorizedOwner')
        .withArgs(otherSigner.address, 0, 6);
    });

    it('should emit PermissionDelegated when the permission got delegated successfully', async () => {
      await expect(
        pm.delegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          6
        )
      )
        .to.emit(pm, 'PermissionDelegated')
        .withArgs(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, 6);
    });
  });

  describe('undelegatePermission', () => {
    beforeEach(async () => {
      await pm.createPermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        ownerSigner.address,
        ['0xb794f5ea0ba39494ce839613fffba74279579268']
      );

      await pm.delegatePermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        otherSigner.address,
        6
      );
    });

    it('should revert with FlagCanNotBeZero when a zero flag is passed', async () => {
      await expect(
        pm.undelegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          0
        )
      ).to.be.revertedWithCustomError(pm, 'FlagCanNotBeZero');
    });

    it('should revert with UnauthorizedOwner if the caller isnt the owner of the permission he wants to undelegate', async () => {
      await expect(
        pm
          .connect(otherSigner)
          .undelegatePermission(
            pm.address,
            ADMIN_PERMISSION_ID,
            otherSigner.address,
            6
          )
      )
        .to.be.revertedWithCustomError(pm, 'UnauthorizedOwner')
        .withArgs(otherSigner.address, 0, 6);
    });

    it('should emit PermissionUndelegated when the permissiion got undelegated successfully', async () => {
      await expect(
        pm.undelegatePermission(
          pm.address,
          ADMIN_PERMISSION_ID,
          otherSigner.address,
          4
        )
      )
        .to.emit(pm, 'PermissionUndelegated')
        .withArgs(pm.address, ADMIN_PERMISSION_ID, otherSigner.address, 2);
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
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [ownerSigner.address]
        );

      await pm
        .connect(ownerSigner)
        .addOwner(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          '0x0000000000000000000000000000000000000001',
          2
        );

      await pm
        .connect(ownerSigner)
        .removeOwner(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          6
        );

      await expect(
        pm
          .connect(ownerSigner)
          .grant(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      )
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );
    });

    it('should revert if the caller doesnt have the grant flag set', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [otherSigner.address]
        );

      await expect(
        pm
          .connect(otherSigner)
          .grant(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          otherSigner.address,
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );
    });

    it('should allow the root user as fallback if the permission is created but no grant owners are existing anymore', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          [ownerSigner.address]
        );

      await pm
        .connect(otherSigner)
        .removeOwner(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          2
        );

      await expect(
        pm
          .connect(ownerSigner)
          .grant(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      ).to.emit(pm, 'Granted');
    });

    it('should allow the root user as fallback if the permission isnt created', async () => {
      await expect(
        pm
          .connect(ownerSigner)
          .grant(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      ).to.emit(pm, 'Granted');
    });

    it('should allow the delegatee to call grant once', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [ownerSigner.address]
        );

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          2
        );

      await expect(
        pm
          .connect(otherSigner)
          .grant(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      ).to.emit(pm, 'Granted');

      await expect(
        pm
          .connect(otherSigner)
          .grant(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          otherSigner.address,
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );
    });

    it('should revert if undelegate got called before grantWithCondition got called by the delegatee', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [otherSigner.address]
        );

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          4
        );

      await pm
        .connect(ownerSigner)
        .undelegatePermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          4
        );

      await expect(
        pm
          .connect(otherSigner)
          .grant(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          otherSigner.address,
          '0x0000000000000000000000000000000000000000000000000000000012345678'
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
        .to.be.revertedWithCustomError(pm, 'ConditionInterfacNotSupported')
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
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [ownerSigner.address]
        );

      await pm
        .connect(ownerSigner)
        .addOwner(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          '0x0000000000000000000000000000000000000001',
          2
        );

      await pm
        .connect(ownerSigner)
        .removeOwner(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          6
        );

      await expect(
        pm
          .connect(ownerSigner)
          .grantWithCondition(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678',
            conditionMock.address
          )
      )
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );
    });

    it('should revert if the caller doesnt have the grantWithCondition flag set', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [otherSigner.address]
        );

      await expect(
        pm
          .connect(otherSigner)
          .grantWithCondition(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678',
            conditionMock.address
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          otherSigner.address,
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );
    });

    it('should allow the root user as fallback if the permission is created but no grantWithCondition owners are existing anymore', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          [ownerSigner.address]
        );

      await pm
        .connect(otherSigner)
        .removeOwner(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          2
        );

      await expect(
        pm
          .connect(ownerSigner)
          .grantWithCondition(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678',
            conditionMock.address
          )
      ).to.emit(pm, 'Granted');
    });

    it('should allow the root user as fallback if the permission isnt created', async () => {
      await expect(
        pm
          .connect(ownerSigner)
          .grantWithCondition(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678',
            conditionMock.address
          )
      ).to.emit(pm, 'Granted');
    });

    it('should allow the delegatee to call grantWithCondition once', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [ownerSigner.address]
        );

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          2
        );

      await expect(
        pm
          .connect(otherSigner)
          .grantWithCondition(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678',
            conditionMock.address
          )
      ).to.emit(pm, 'Granted');

      await expect(
        pm
          .connect(otherSigner)
          .grantWithCondition(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678',
            conditionMock.address
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          otherSigner.address,
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );
    });

    it('should revert if undelegate got called before grantWithCondition got called by the delegatee', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [otherSigner.address]
        );

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          4
        );

      await pm
        .connect(ownerSigner)
        .undelegatePermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          4
        );

      await expect(
        pm
          .connect(otherSigner)
          .grantWithCondition(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678',
            conditionMock.address
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          otherSigner.address,
          '0x0000000000000000000000000000000000000000000000000000000012345678'
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
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [ownerSigner.address]
        );

      await pm
        .connect(ownerSigner)
        .addOwner(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          '0x0000000000000000000000000000000000000001',
          2
        );

      await pm
        .connect(ownerSigner)
        .removeOwner(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          6
        );

      await expect(
        pm
          .connect(ownerSigner)
          .revoke(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      )
        .to.be.revertedWithCustomError(pm, 'PermissionFrozen')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );
    });

    it('should revert if the caller doesnt have the revoke flag set', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [otherSigner.address]
        );

      await expect(
        pm
          .connect(otherSigner)
          .revoke(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          otherSigner.address,
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );
    });

    it('should allow the root user as fallback if the permission is created but no revoke owners are existing anymore', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          [otherSigner.address]
        );

      await pm
        .connect(otherSigner)
        .removeOwner(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          4
        );

      await expect(
        pm
          .connect(ownerSigner)
          .revoke(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      ).to.emit(pm, 'Revoked');
    });

    it('should allow the root user as fallback if the permission isnt created', async () => {
      await pm
        .connect(ownerSigner)
        .grant(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          otherSigner.address,
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );

      await expect(
        pm
          .connect(ownerSigner)
          .revoke(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      ).to.emit(pm, 'Revoked');
    });

    it('should allow the delegatee to call revoke once', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [otherSigner.address]
        );

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          4
        );

      await expect(
        pm
          .connect(otherSigner)
          .revoke(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      ).to.emit(pm, 'Revoked');

      await expect(
        pm
          .connect(otherSigner)
          .revoke(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          otherSigner.address,
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );
    });

    it('should revert if undelegate got called before revoke got called by the delegatee', async () => {
      await pm
        .connect(ownerSigner)
        .createPermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          ownerSigner.address,
          [otherSigner.address]
        );

      await pm
        .connect(ownerSigner)
        .delegatePermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          4
        );

      await pm
        .connect(ownerSigner)
        .undelegatePermission(
          '0xb794f5ea0ba39494ce839613fffba74279579268',
          '0x0000000000000000000000000000000000000000000000000000000012345678',
          otherSigner.address,
          4
        );

      await expect(
        pm
          .connect(otherSigner)
          .revoke(
            '0xb794f5ea0ba39494ce839613fffba74279579268',
            otherSigner.address,
            '0x0000000000000000000000000000000000000000000000000000000012345678'
          )
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(
          '0xb794F5eA0ba39494cE839613fffBA74279579268',
          otherSigner.address,
          '0x0000000000000000000000000000000000000000000000000000000012345678'
        );
    });
  });

  describe('bulk on multiple target', () => {
    it('should bulk grant ADMIN_PERMISSION on different targets', async () => {
      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.Grant,
          where: otherSigner.address,
          who: ownerSigner.address,
          condition: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          where: ownerSigner.address,
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
        expect(permission).to.be.equal(ALLOW_FLAG);
      }
    });

    it('should bulk grant ADMIN_PERMISSION with apply target permission and owners defined', async () => {
      const bulkItem: MultiTargetPermission = {
        operation: Operation.Grant,
        where: ownerSigner.address,
        who: otherSigner.address,
        condition: addressZero,
        permissionId: ADMIN_PERMISSION_ID,
      };

      await pm.createPermission(
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        otherSigner.address,
        ['0xb794F5eA0ba39494cE839613fffBA74279579268']
      );
      await pm.grant(
        pm.address,
        otherSigner.address,
        APPLY_TARGET_PERMISSION_ID
      );

      await pm.connect(otherSigner).applyMultiTargetPermissions([bulkItem]);

      const permission = await pm.getAuthPermission(
        bulkItem.where,
        bulkItem.who,
        bulkItem.permissionId
      );

      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should bulk grant ADMIN_PERMISSION as root with apply target permission who is an owner as well', async () => {
      const bulkItem: MultiTargetPermission = {
        operation: Operation.Grant,
        where: otherSigner.address,
        who: ownerSigner.address,
        condition: addressZero,
        permissionId: ADMIN_PERMISSION_ID,
      };

      await pm.createPermission(
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        otherSigner.address,
        ['0xb794F5eA0ba39494cE839613fffBA74279579268']
      );
      await pm.grant(
        pm.address,
        ownerSigner.address,
        APPLY_TARGET_PERMISSION_ID
      );

      await pm.connect(ownerSigner).applyMultiTargetPermissions([bulkItem]);

      const permission = await pm.getAuthPermission(
        bulkItem.where,
        bulkItem.who,
        bulkItem.permissionId
      );

      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should bulk grant ADMIN_PERMISSION with apply target permission where the caller is root without having a permission created for item.where', async () => {
      const bulkItem: MultiTargetPermission = {
        operation: Operation.Grant,
        where: otherSigner.address,
        who: ownerSigner.address,
        condition: addressZero,
        permissionId: ADMIN_PERMISSION_ID,
      };

      await pm.grant(
        pm.address,
        otherSigner.address,
        APPLY_TARGET_PERMISSION_ID
      );
      await pm.applyMultiTargetPermissions([bulkItem]);

      const permission = await pm.getAuthPermission(
        bulkItem.where,
        bulkItem.who,
        bulkItem.permissionId
      );

      expect(permission).to.be.equal(ALLOW_FLAG);
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
          where: otherSigner.address,
          who: ownerSigner.address,
          condition: conditionMock.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.GrantWithCondition,
          where: ownerSigner.address,
          who: ownerSigner.address,
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

    it('throws Unauthorized error when caller does not have the apply target permission and isnt root', async () => {
      await pm.revoke(
        pm.address,
        otherSigner.address,
        APPLY_TARGET_PERMISSION_ID
      );

      const bulkItems: MultiTargetPermission[] = [
        {
          operation: Operation.Grant,
          where: ownerSigner.address,
          who: otherSigner.address,
          condition: addressZero,
          permissionId: ADMIN_PERMISSION_ID,
        },
      ];

      await expect(
        pm.connect(otherSigner).applyMultiTargetPermissions(bulkItems)
      )
        .to.be.revertedWithCustomError(pm, 'Unauthorized')
        .withArgs(pm.address, otherSigner.address, APPLY_TARGET_PERMISSION_ID);
    });
  });

  describe('bulk on single target', () => {
    it('should bulk grant ADMIN_PERMISSION', async () => {
      const bulkItems: SingleTargetPermission[] = [
        {
          operation: Operation.Grant,
          who: ownerSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          who: ownerSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          who: ownerSigner.address,
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

    it('should bulk grant ADMIN_PERMISSION with apply target permission and owners defined', async () => {
      const bulkItem: SingleTargetPermission = {
        operation: Operation.Grant,
        who: otherSigner.address,
        permissionId: ADMIN_PERMISSION_ID,
      };

      await pm.createPermission(
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        otherSigner.address,
        ['0xb794F5eA0ba39494cE839613fffBA74279579268']
      );

      await pm.grant(
        pm.address,
        otherSigner.address,
        APPLY_TARGET_PERMISSION_ID
      );

      await pm.setAllowedContract(otherSigner.address);

      await pm
        .connect(otherSigner)
        .applySingleTargetPermissions(ownerSigner.address, [bulkItem]);

      const permission = await pm.getAuthPermission(
        ownerSigner.address,
        bulkItem.who,
        bulkItem.permissionId
      );

      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should bulk grant ADMIN_PERMISSION as root with apply target permission who is an owner as well', async () => {
      const bulkItem: SingleTargetPermission = {
        operation: Operation.Grant,
        who: ownerSigner.address,
        permissionId: ADMIN_PERMISSION_ID,
      };

      await pm.createPermission(
        ownerSigner.address,
        ADMIN_PERMISSION_ID,
        otherSigner.address,
        ['0xb794F5eA0ba39494cE839613fffBA74279579268']
      );
      await pm.grant(
        pm.address,
        ownerSigner.address,
        APPLY_TARGET_PERMISSION_ID
      );

      await pm
        .connect(ownerSigner)
        .applySingleTargetPermissions(otherSigner.address, [bulkItem]);

      const permission = await pm.getAuthPermission(
        otherSigner.address,
        bulkItem.who,
        bulkItem.permissionId
      );

      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should bulk grant ADMIN_PERMISSION with apply target permission where the caller is root without having a permission created for item.where', async () => {
      const bulkItem: SingleTargetPermission = {
        operation: Operation.Grant,
        who: ownerSigner.address,
        permissionId: ADMIN_PERMISSION_ID,
      };

      await pm.grant(
        pm.address,
        otherSigner.address,
        APPLY_TARGET_PERMISSION_ID
      );
      await pm.applySingleTargetPermissions(otherSigner.address, [bulkItem]);

      const permission = await pm.getAuthPermission(
        otherSigner.address,
        bulkItem.who,
        bulkItem.permissionId
      );

      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should bulk revoke', async () => {
      await pm.grant(pm.address, signers[1].address, ADMIN_PERMISSION_ID);
      await pm.grant(pm.address, signers[2].address, ADMIN_PERMISSION_ID);
      await pm.grant(pm.address, signers[3].address, ADMIN_PERMISSION_ID);
      const bulkItems: SingleTargetPermission[] = [
        {
          operation: Operation.Revoke,
          who: ownerSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Revoke,
          who: ownerSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Revoke,
          who: ownerSigner.address,
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

    it('should handle bulk mixed', async () => {
      await pm.createPermission(
        pm.address,
        ADMIN_PERMISSION_ID,
        ownerSigner.address,
        [otherSigner.address]
      );

      const bulkItems: SingleTargetPermission[] = [
        {
          operation: Operation.Revoke,
          who: otherSigner.address,
          permissionId: ADMIN_PERMISSION_ID,
        },
        {
          operation: Operation.Grant,
          who: ownerSigner.address,
          permissionId: APPLY_TARGET_PERMISSION_ID,
        },
      ];

      await pm.applySingleTargetPermissions(pm.address, bulkItems);
      expect(
        await pm.getAuthPermission(
          pm.address,
          otherSigner.address,
          ADMIN_PERMISSION_ID
        )
      ).to.be.equal(UNSET_FLAG);
      expect(
        await pm.getAuthPermission(
          pm.address,
          ownerSigner.address,
          APPLY_TARGET_PERMISSION_ID
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
        .withArgs(pm.address, otherSigner.address, APPLY_TARGET_PERMISSION_ID);
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
        .withArgs(pm.address, otherSigner.address, APPLY_TARGET_PERMISSION_ID);
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
