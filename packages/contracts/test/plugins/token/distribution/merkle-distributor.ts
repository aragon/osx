// Copied and modified from: https://github.com/Uniswap/merkle-distributor/blob/master/test/MerkleDistributor.spec.ts

import {expect} from 'chai';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  MerkleDistributor,
  DAO,
  TestERC20,
  IERC165Upgradeable__factory,
  IPlugin__factory,
  IMerkleDistributor__factory,
} from '../../../../typechain';
import {deployWithProxy} from '../../../test-utils/proxy';
import BalanceTree from './src/balance-tree';
import {deployNewDAO} from '../../../test-utils/dao';
import {getInterfaceID} from '../../../test-utils/interfaces';
import {shouldUpgradeCorrectly} from '../../../test-utils/uups-upgradeable';
import {UPGRADE_PERMISSIONS} from '../../../test-utils/permissions';

const ZERO_BYTES32 = `0x${`0`.repeat(64)}`;

describe('MerkleDistributor', function () {
  let signers: SignerWithAddress[];
  let distributor: MerkleDistributor;
  let dao: DAO;
  let token: TestERC20;
  let wallet0: string;
  let wallet1: string;

  beforeEach(async function () {
    signers = await ethers.getSigners();
    wallet0 = await signers[0].getAddress();
    wallet1 = await signers[1].getAddress();

    // create a DAO
    const DAO = await ethers.getContractFactory('DAO');
    dao = await deployNewDAO(wallet0);

    const TestERC20 = await ethers.getContractFactory('TestERC20');
    token = await TestERC20.deploy('FOO', 'FOO', 0); // mint 0 FOO tokens

    const MerkleDistributor = await ethers.getContractFactory(
      'MerkleDistributor'
    );
    distributor = await deployWithProxy(MerkleDistributor);
  });

  describe('plugin interface: ', async () => {
    it('does not support the empty interface', async () => {
      expect(await distributor.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await distributor.supportsInterface(getInterfaceID(iface))).to.be
        .true;
    });

    it('supports the `IPlugin` interface', async () => {
      const iface = IPlugin__factory.createInterface();
      expect(await distributor.supportsInterface(getInterfaceID(iface))).to.be
        .true;
    });

    it('supports the `IMerkleDistributor` interface', async () => {
      const iface = IMerkleDistributor__factory.createInterface();
      expect(await distributor.supportsInterface(getInterfaceID(iface))).to.be
        .true;
    });
  });

  describe('Upgrade', () => {
    beforeEach(async function () {
      this.upgrade = {
        contract: distributor,
        dao: dao,
        user: signers[8],
      };
      await distributor.initialize(dao.address, token.address, ZERO_BYTES32);
    });

    shouldUpgradeCorrectly(
      UPGRADE_PERMISSIONS.UPGRADE_PLUGIN_PERMISSION_ID,
      'DaoUnauthorized'
    );
  });

  describe('general', () => {
    beforeEach(async function () {
      await distributor.initialize(dao.address, token.address, ZERO_BYTES32);
    });

    describe('#token', () => {
      it('returns the token address', async () => {
        expect(await distributor.token()).to.eq(token.address);
      });
    });

    describe('#merkleRoot', () => {
      it('returns the zero merkle root', async () => {
        expect(await distributor.merkleRoot()).to.eq(ZERO_BYTES32);
      });
    });

    describe('#claim', () => {
      it('fails for empty proof', async () => {
        await expect(distributor.claim(0, wallet0, 10, []))
          .to.be.revertedWithCustomError(distributor, 'TokenClaimInvalid')
          .withArgs(0, wallet0, 10);
      });

      it('fails for invalid index', async () => {
        await expect(distributor.claim(0, wallet0, 10, []))
          .to.be.revertedWithCustomError(distributor, 'TokenClaimInvalid')
          .withArgs(0, wallet0, 10);
      });
    });
  });

  describe('two account tree', () => {
    let tree: BalanceTree;
    beforeEach('deploy', async () => {
      tree = new BalanceTree([
        {account: wallet0, amount: BigNumber.from(100)},
        {account: wallet1, amount: BigNumber.from(101)},
      ]);

      await distributor.initialize(
        dao.address,
        token.address,
        tree.getHexRoot()
      );
      await token.setBalance(distributor.address, 201);
    });

    describe('unclaimedBalance', async () => {
      it('returns the correct `unclaimedBalance`', async () => {
        const proof0 = tree.getProof(0, wallet0, BigNumber.from(100));
        expect(
          await distributor.unclaimedBalance(0, wallet0, 100, proof0)
        ).to.equal(100);
      });

      it('returns 0 if proof incorrect', async () => {
        const proof0 = [ZERO_BYTES32];
        expect(
          await distributor.unclaimedBalance(0, wallet0, 100, proof0)
        ).to.equal(0);
      });

      it('returns 0 if it was already claimed', async () => {
        const proof0 = tree.getProof(0, wallet0, BigNumber.from(100));
        await distributor.claim(0, wallet0, 100, proof0);
        expect(
          await distributor.unclaimedBalance(0, wallet0, 100, proof0)
        ).to.equal(0);
      });
    });

    it('successful claim', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100));
      await expect(distributor.claim(0, wallet0, 100, proof0))
        .to.emit(distributor, 'Claimed')
        .withArgs(0, wallet0, 100);
      const proof1 = tree.getProof(1, wallet1, BigNumber.from(101));
      await expect(distributor.claim(1, wallet1, 101, proof1))
        .to.emit(distributor, 'Claimed')
        .withArgs(1, wallet1, 101);
    });

    it('transfers the token', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100));
      expect(await token.balanceOf(wallet0)).to.eq(0);
      await distributor.claim(0, wallet0, 100, proof0);
      expect(await token.balanceOf(wallet0)).to.eq(100);
    });

    it('must have enough to transfer', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100));
      await token.setBalance(distributor.address, 99);
      await expect(
        distributor.claim(0, wallet0, 100, proof0)
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });

    it('sets #isClaimed', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100));
      expect(await distributor.isClaimed(0)).to.eq(false);
      expect(await distributor.isClaimed(1)).to.eq(false);
      await distributor.claim(0, wallet0, 100, proof0);
      expect(await distributor.isClaimed(0)).to.eq(true);
      expect(await distributor.isClaimed(1)).to.eq(false);
    });

    it('cannot allow two claims', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100));
      await distributor.claim(0, wallet0, 100, proof0);
      await expect(distributor.claim(0, wallet0, 100, proof0))
        .to.be.revertedWithCustomError(distributor, 'TokenAlreadyClaimed')
        .withArgs(0);
    });

    it('cannot claim more than once: 0 and then 1', async () => {
      await distributor.claim(
        0,
        wallet0,
        100,
        tree.getProof(0, wallet0, BigNumber.from(100))
      );
      await distributor.claim(
        1,
        wallet1,
        101,
        tree.getProof(1, wallet1, BigNumber.from(101))
      );

      await expect(
        distributor.claim(
          0,
          wallet0,
          100,
          tree.getProof(0, wallet0, BigNumber.from(100))
        )
      )
        .to.be.revertedWithCustomError(distributor, 'TokenAlreadyClaimed')
        .withArgs(0);
    });

    it('cannot claim more than once: 1 and then 0', async () => {
      await distributor.claim(
        1,
        wallet1,
        101,
        tree.getProof(1, wallet1, BigNumber.from(101))
      );
      await distributor.claim(
        0,
        wallet0,
        100,
        tree.getProof(0, wallet0, BigNumber.from(100))
      );

      await expect(
        distributor.claim(
          1,
          wallet1,
          101,
          tree.getProof(1, wallet1, BigNumber.from(101))
        )
      )
        .to.be.revertedWithCustomError(distributor, 'TokenAlreadyClaimed')
        .withArgs(1);
    });

    it('cannot claim for address other than proof', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100));
      await expect(distributor.claim(1, wallet1, 101, proof0))
        .to.be.revertedWithCustomError(distributor, 'TokenClaimInvalid')
        .withArgs(1, wallet1, 101);
    });

    it('cannot claim more than proof', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100));
      await expect(distributor.claim(0, wallet0, 101, proof0))
        .to.be.revertedWithCustomError(distributor, 'TokenClaimInvalid')
        .withArgs(0, wallet0, 101);
    });
  });

  describe('larger tree', () => {
    let tree: BalanceTree;
    beforeEach('deploy', async () => {
      tree = new BalanceTree(
        signers.map((wallet, ix) => {
          return {account: wallet.address, amount: BigNumber.from(ix + 1)};
        })
      );
      await distributor.initialize(
        dao.address,
        token.address,
        tree.getHexRoot()
      );
      await token.setBalance(distributor.address, 201);
    });

    it('claim index 4', async () => {
      const proof = tree.getProof(4, signers[4].address, BigNumber.from(5));
      await expect(distributor.claim(4, signers[4].address, 5, proof))
        .to.emit(distributor, 'Claimed')
        .withArgs(4, signers[4].address, 5);
    });

    it('claim index 9', async () => {
      const proof = tree.getProof(9, signers[9].address, BigNumber.from(10));
      await expect(distributor.claim(9, signers[9].address, 10, proof))
        .to.emit(distributor, 'Claimed')
        .withArgs(9, signers[9].address, 10);
    });
  });
});
