import {expect} from 'chai';
import {ethers} from 'hardhat';
import {ACLTest, ACLOracleMock} from '../../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

const ROOT_ROLE = ethers.utils.id('ROOT_ROLE');
const ADMIN_ROLE = ethers.utils.id('ADMIN_ROLE');
const UNSET_ROLE = ethers.utils.getAddress(
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
  op: BulkOP;
  role: string;
  who: string;
}

describe('Core: ACL', function () {
  let acl: ACLTest;
  let ownerSigner: SignerWithAddress;
  let otherSigner: SignerWithAddress;

  before(async () => {
    const signers = await ethers.getSigners();
    ownerSigner = signers[0];
    otherSigner = signers[1];
  });

  beforeEach(async () => {
    const ACL = await ethers.getContractFactory('ACLTest');
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
      const ACL = await ethers.getContractFactory('ACLTest');
      acl = await ACL.deploy();
      await expect(acl.init(ownerSigner.address)).to.emit(acl, 'Granted');
    });

    it('should add ROOT_ROLE', async () => {
      const permission = await acl.getAuthPermission(
        acl.address,
        ownerSigner.address,
        ROOT_ROLE
      );
      expect(permission).to.be.equal(ALLOW_FLAG);
    });
  });

  describe('grant', () => {
    it('should add permission', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      const permission = await acl.getAuthPermission(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE
      );
      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should emit Granted', async () => {
      await expect(
        acl.grant(acl.address, otherSigner.address, ADMIN_ROLE)
      ).to.emit(acl, 'Granted');
    });

    it('should revert with already granted', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      await expect(
        acl.grant(acl.address, otherSigner.address, ADMIN_ROLE)
      ).to.be.revertedWith('acl: role already granted');
    });

    it('should revert if frozen', async () => {
      await acl.freeze(acl.address, ADMIN_ROLE);
      await expect(
        acl.grant(acl.address, otherSigner.address, ADMIN_ROLE)
      ).to.be.revertedWith('acl: frozen');
    });

    it('should not allow grant', async () => {
      await expect(
        acl
          .connect(otherSigner)
          .grant(acl.address, otherSigner.address, ADMIN_ROLE)
      ).to.be.revertedWith('acl: auth');
    });

    it('should not allow for non ROOT', async () => {
      await acl.grant(acl.address, ownerSigner.address, ADMIN_ROLE);
      await expect(
        acl
          .connect(otherSigner)
          .grant(acl.address, otherSigner.address, ROOT_ROLE)
      ).to.be.revertedWith('acl: auth');
    });
  });

  describe('grantWithOracle', () => {
    it('should add permission', async () => {
      await acl.grantWithOracle(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE,
        ALLOW_FLAG
      );
      const permission = await acl.getAuthPermission(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE
      );
      expect(permission).to.be.equal(ALLOW_FLAG);
    });

    it('should emit Granted', async () => {
      await expect(
        acl.grantWithOracle(
          acl.address,
          otherSigner.address,
          ADMIN_ROLE,
          ALLOW_FLAG
        )
      ).to.emit(acl, 'Granted');
    });

    it('should revert with already granted', async () => {
      await acl.grantWithOracle(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE,
        ALLOW_FLAG
      );
      await expect(
        acl.grantWithOracle(
          acl.address,
          otherSigner.address,
          ADMIN_ROLE,
          ALLOW_FLAG
        )
      ).to.be.revertedWith('acl: role already granted');
    });

    it('should revert if frozen', async () => {
      await acl.freeze(acl.address, ADMIN_ROLE);
      await expect(
        acl.grantWithOracle(
          acl.address,
          otherSigner.address,
          ADMIN_ROLE,
          ALLOW_FLAG
        )
      ).to.be.revertedWith('acl: frozen');
    });

    it('should set ACLOracle', async () => {
      const signers = await ethers.getSigners();
      await acl.grantWithOracle(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE,
        signers[2].address
      );
      expect(
        await acl.getAuthPermission(
          acl.address,
          otherSigner.address,
          ADMIN_ROLE
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
            ADMIN_ROLE,
            ALLOW_FLAG
          )
      ).to.be.revertedWith('acl: auth');
    });

    it('should not allow for non ROOT', async () => {
      await acl.grantWithOracle(
        acl.address,
        ownerSigner.address,
        ADMIN_ROLE,
        ALLOW_FLAG
      );
      await expect(
        acl
          .connect(otherSigner)
          .grantWithOracle(
            acl.address,
            otherSigner.address,
            ROOT_ROLE,
            ALLOW_FLAG
          )
      ).to.be.revertedWith('acl: auth');
    });
  });

  describe('revoke', () => {
    it('should revoke', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      await acl.revoke(acl.address, otherSigner.address, ADMIN_ROLE);
      const permission = await acl.getAuthPermission(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE
      );
      expect(permission).to.be.equal(UNSET_ROLE);
    });

    it('should emit Revoked', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      await expect(
        acl.revoke(acl.address, otherSigner.address, ADMIN_ROLE)
      ).to.emit(acl, 'Revoked');
    });

    it('should revert if not granted', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      await expect(
        acl
          .connect(otherSigner)
          .revoke(acl.address, otherSigner.address, ADMIN_ROLE)
      ).to.be.revertedWith('acl: auth');
    });

    it('should revert if frozen', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      await acl.freeze(acl.address, ADMIN_ROLE);
      await expect(
        acl.revoke(acl.address, otherSigner.address, ADMIN_ROLE)
      ).to.be.revertedWith('acl: frozen');
    });

    it('should revert if already revoked', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      await acl.revoke(acl.address, otherSigner.address, ADMIN_ROLE);
      await expect(
        acl.revoke(acl.address, otherSigner.address, ADMIN_ROLE)
      ).to.be.revertedWith('acl: role already revoked');
    });

    it('should not allow', async () => {
      await expect(
        acl
          .connect(otherSigner)
          .revoke(acl.address, otherSigner.address, ADMIN_ROLE)
      ).to.be.revertedWith('acl: auth');
    });

    it('should not allow for non ROOT', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      await expect(
        acl
          .connect(otherSigner)
          .revoke(acl.address, otherSigner.address, ADMIN_ROLE)
      ).to.be.revertedWith('acl: auth');
    });
  });

  describe('freeze', () => {
    it('should freeze', async () => {
      await acl.freeze(acl.address, ADMIN_ROLE);
      const forzen = await acl.getFreezePermission(acl.address, ADMIN_ROLE);
      expect(forzen).to.be.equal(true);
    });

    it('should emit Frozen', async () => {
      await expect(acl.freeze(acl.address, ADMIN_ROLE)).to.emit(acl, 'Frozen');
    });

    it('should revert if already frozen', async () => {
      await acl.freeze(acl.address, ADMIN_ROLE);
      await expect(acl.freeze(acl.address, ADMIN_ROLE)).to.be.revertedWith(
        'acl: role already freeze'
      );
    });

    it('should not allow', async () => {
      await expect(
        acl.connect(otherSigner).freeze(acl.address, ADMIN_ROLE)
      ).to.be.revertedWith('acl: auth');
    });

    it('should not allow for non ROOT', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      await expect(
        acl.connect(otherSigner).freeze(acl.address, ADMIN_ROLE)
      ).to.be.revertedWith('acl: auth');
    });
  });

  describe('bulk', () => {
    it('should bulk grant ADMIN_ROLE', async () => {
      const signers = await ethers.getSigners();
      const bulkItems: BulkItem[] = [
        {
          op: BulkOP.Grant,
          role: ADMIN_ROLE,
          who: signers[1].address,
        },
        {
          op: BulkOP.Grant,
          role: ADMIN_ROLE,
          who: signers[2].address,
        },
        {
          op: BulkOP.Grant,
          role: ADMIN_ROLE,
          who: signers[3].address,
        },
      ];
      await acl.bulk(acl.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await acl.getAuthPermission(
          acl.address,
          item.who,
          item.role
        );
        expect(permission).to.be.equal(ALLOW_FLAG);
      }
    });

    it('should bulk freeze', async () => {
      const signers = await ethers.getSigners();
      const bulkItems: BulkItem[] = [
        {
          op: BulkOP.Freeze,
          role: ethers.utils.id('ROLE_1'),
          who: signers[1].address,
        },
        {
          op: BulkOP.Freeze,
          role: ethers.utils.id('ROLE_2'),
          who: signers[2].address,
        },
        {
          op: BulkOP.Freeze,
          role: ethers.utils.id('ROLE_3'),
          who: signers[3].address,
        },
      ];
      await acl.bulk(acl.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await acl.getFreezePermission(
          acl.address,
          item.role
        );
        expect(permission).to.be.equal(true);
      }
    });

    it('should bulk revoke', async () => {
      const signers = await ethers.getSigners();
      await acl.grant(acl.address, signers[1].address, ADMIN_ROLE);
      await acl.grant(acl.address, signers[2].address, ADMIN_ROLE);
      await acl.grant(acl.address, signers[3].address, ADMIN_ROLE);
      const bulkItems: BulkItem[] = [
        {
          op: BulkOP.Revoke,
          role: ADMIN_ROLE,
          who: signers[1].address,
        },
        {
          op: BulkOP.Revoke,
          role: ADMIN_ROLE,
          who: signers[2].address,
        },
        {
          op: BulkOP.Revoke,
          role: ADMIN_ROLE,
          who: signers[3].address,
        },
      ];
      await acl.bulk(acl.address, bulkItems);
      for (const item of bulkItems) {
        const permission = await acl.getAuthPermission(
          acl.address,
          item.who,
          item.role
        );
        expect(permission).to.be.equal(UNSET_ROLE);
      }
    });

    it('should handle bulk mixed', async () => {
      const signers = await ethers.getSigners();
      await acl.grant(acl.address, signers[1].address, ADMIN_ROLE);
      const bulkItems: BulkItem[] = [
        {
          op: BulkOP.Revoke,
          role: ADMIN_ROLE,
          who: signers[1].address,
        },
        {
          op: BulkOP.Grant,
          role: ADMIN_ROLE,
          who: signers[2].address,
        },
        {
          op: BulkOP.Freeze,
          role: ADMIN_ROLE,
          who: signers[3].address,
        },
      ];

      await acl.bulk(acl.address, bulkItems);
      expect(
        await acl.getAuthPermission(acl.address, signers[1].address, ADMIN_ROLE)
      ).to.be.equal(UNSET_ROLE);
      expect(
        await acl.getAuthPermission(acl.address, signers[2].address, ADMIN_ROLE)
      ).to.be.equal(ALLOW_FLAG);
      expect(
        await acl.getFreezePermission(acl.address, ADMIN_ROLE)
      ).to.be.equal(true);
    });

    it('should revert on error', async () => {
      const signers = await ethers.getSigners();
      await acl.grant(acl.address, signers[1].address, ADMIN_ROLE);
      const bulkItems: BulkItem[] = [
        {
          op: BulkOP.Revoke,
          role: ADMIN_ROLE,
          who: signers[1].address,
        },
        {
          op: BulkOP.Grant,
          role: ADMIN_ROLE,
          who: signers[2].address,
        },
        {
          op: BulkOP.Freeze,
          role: ADMIN_ROLE,
          who: signers[3].address,
        },
        {
          op: BulkOP.Freeze,
          role: ADMIN_ROLE,
          who: signers[3].address,
        },
      ];

      await expect(acl.bulk(acl.address, bulkItems)).to.be.revertedWith(
        'acl: role already freeze'
      );
      expect(
        await acl.getAuthPermission(acl.address, signers[1].address, ADMIN_ROLE)
      ).to.be.equal(ALLOW_FLAG);
      expect(
        await acl.getAuthPermission(acl.address, signers[2].address, ADMIN_ROLE)
      ).to.be.equal(UNSET_ROLE);
      expect(
        await acl.getFreezePermission(acl.address, ADMIN_ROLE)
      ).to.be.equal(false);
    });

    it('should not allow', async () => {
      const bulkItems: BulkItem[] = [
        {
          op: BulkOP.Grant,
          role: ADMIN_ROLE,
          who: otherSigner.address,
        },
      ];
      await expect(
        acl.connect(otherSigner).bulk(acl.address, bulkItems)
      ).to.be.revertedWith('acl: auth');
    });

    it('should not allow for non ROOT', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      const bulkItems: BulkItem[] = [
        {
          op: BulkOP.Grant,
          role: ADMIN_ROLE,
          who: otherSigner.address,
        },
      ];
      await expect(
        acl.connect(otherSigner).bulk(acl.address, bulkItems)
      ).to.be.revertedWith('acl: auth');
    });
  });

  describe('willPerform', () => {
    it('should return true fcr granted user', async () => {
      await acl.grant(acl.address, otherSigner.address, ADMIN_ROLE);
      const willPerform = await acl.callStatic.willPerform(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE,
        []
      );
      expect(willPerform).to.be.equal(true);
    });

    it('should return false for non granted user', async () => {
      const willPerform = await acl.callStatic.willPerform(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE,
        []
      );
      expect(willPerform).to.be.equal(false);
    });

    it('should return true for any who granted role', async () => {
      const anyAddr = await acl.getAnyAddr();
      await acl.grant(acl.address, anyAddr, ADMIN_ROLE);
      const willPerform = await acl.callStatic.willPerform(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE,
        []
      );
      expect(willPerform).to.be.equal(true);
    });

    it('should return true for any where granted role', async () => {
      const anyAddr = await acl.getAnyAddr();
      await acl.grant(anyAddr, otherSigner.address, ADMIN_ROLE);
      const willPerform = await acl.callStatic.willPerform(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE,
        []
      );
      expect(willPerform).to.be.equal(true);
    });

    it('should be callable by anyone', async () => {
      const willPerform = await acl
        .connect(otherSigner)
        .callStatic.willPerform(
          acl.address,
          otherSigner.address,
          ADMIN_ROLE,
          []
        );
      expect(willPerform).to.be.equal(false);
    });
  });

  describe('isFrozen', () => {
    it('should return true', async () => {
      await acl.freeze(acl.address, ADMIN_ROLE);
      const isFrozen = await acl.callStatic.isFrozen(acl.address, ADMIN_ROLE);
      expect(isFrozen).to.be.equal(true);
    });

    it('should return false', async () => {
      const isFrozen = await acl.callStatic.isFrozen(acl.address, ADMIN_ROLE);
      expect(isFrozen).to.be.equal(false);
    });

    it('should be callable by anyone', async () => {
      const isFrozen = await acl
        .connect(otherSigner)
        .callStatic.isFrozen(acl.address, ADMIN_ROLE);
      expect(isFrozen).to.be.equal(false);
    });
  });

  describe('_checkRole', () => {
    let aclOracle: ACLOracleMock;

    beforeEach(async () => {
      const aclOracleFactory = await ethers.getContractFactory('ACLOracleMock');
      aclOracle = await aclOracleFactory.deploy();
    });

    it('should call IACLOracle.willPerform', async () => {
      await acl.grantWithOracle(
        acl.address,
        otherSigner.address,
        ADMIN_ROLE,
        aclOracle.address
      );
      expect(
        await acl.callStatic.willPerform(
          acl.address,
          otherSigner.address,
          ADMIN_ROLE,
          []
        )
      ).to.be.equal(true);

      await aclOracle.setWillPerform(false);
      expect(
        await acl.callStatic.willPerform(
          acl.address,
          otherSigner.address,
          ADMIN_ROLE,
          []
        )
      ).to.be.equal(false);
    });
  });

  describe('helpers', () => {
    it('should hash PERMISSIONS', async () => {
      const packed = ethers.utils.solidityPack(
        ['string', 'address', 'address', 'address'],
        ['PERMISSION', ownerSigner.address, acl.address, ROOT_ROLE]
      );
      const hash = ethers.utils.keccak256(packed);
      const contractHash = await acl.getPermissionHash(
        acl.address,
        ownerSigner.address,
        ROOT_ROLE
      );
      expect(hash).to.be.equal(contractHash);
    });

    it('should hash FREEZE', async () => {
      const packed = ethers.utils.solidityPack(
        ['string', 'address', 'address'],
        ['FREEZE', acl.address, ROOT_ROLE]
      );
      const hash = ethers.utils.keccak256(packed);
      const contractHash = await acl.getFreezeHash(acl.address, ROOT_ROLE);
      expect(hash).to.be.equal(contractHash);
    });
  });
});
