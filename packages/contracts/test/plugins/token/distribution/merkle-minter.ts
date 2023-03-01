// Copied and modified from: https://github.com/Uniswap/merkle-distributor/blob/master/test/MerkleDistributor.spec.ts

import {expect} from 'chai';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  MerkleMinter,
  MerkleDistributor,
  DAO,
  GovernanceERC20,
  IERC165Upgradeable__factory,
  IPlugin__factory,
  IMerkleMinter__factory,
} from '../../../../typechain';
import BalanceTree from './src/balance-tree';
import {deployNewDAO} from '../../../test-utils/dao';
import {deployWithProxy} from '../../../test-utils/proxy';
import {getInterfaceID} from '../../../test-utils/interfaces';
import {shouldUpgradeCorrectly} from '../../../test-utils/uups-upgradeable';
import {UPGRADE_PERMISSIONS} from '../../../test-utils/permissions';

const MERKLE_MINT_PERMISSION_ID = ethers.utils.id('MERKLE_MINT_PERMISSION');
const MINT_PERMISSION_ID = ethers.utils.id('MINT_PERMISSION');

describe('MerkleMinter', function () {
  let signers: SignerWithAddress[];
  let minter: MerkleMinter;
  let distributorBase: MerkleDistributor;
  let managingDao: DAO;
  let token: GovernanceERC20;
  let ownerAddress: string;

  let tree: BalanceTree;
  let merkleRoot: string;
  let totalAmount: BigNumber;

  beforeEach(async function () {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const amount0 = BigNumber.from(100);
    const amount1 = BigNumber.from(101);

    tree = new BalanceTree([
      {account: signers[0].address, amount: amount0},
      {account: signers[1].address, amount: amount1},
    ]);
    merkleRoot = tree.getHexRoot();
    totalAmount = amount0.add(amount1);

    // create a DAO
    managingDao = await deployNewDAO(ownerAddress);

    const GovernanceERC20 = await ethers.getContractFactory('GovernanceERC20');
    token = await GovernanceERC20.deploy(managingDao.address, 'GOV', 'GOV', {
      receivers: [],
      amounts: [],
    });

    const MerkleDistributor = await ethers.getContractFactory(
      'MerkleDistributor'
    );
    distributorBase = await MerkleDistributor.deploy();

    const MerkleMinter = await ethers.getContractFactory('MerkleMinter');
    minter = await deployWithProxy(MerkleMinter);

    await minter.initialize(
      managingDao.address,
      token.address,
      distributorBase.address
    );
    await managingDao.grant(
      minter.address,
      ownerAddress,
      MERKLE_MINT_PERMISSION_ID
    );
    await managingDao.grant(token.address, minter.address, MINT_PERMISSION_ID);

    this.upgrade = {
      contract: minter,
      dao: managingDao,
      user: signers[8],
    };
  });

  shouldUpgradeCorrectly(
    UPGRADE_PERMISSIONS.UPGRADE_PLUGIN_PERMISSION_ID,
    'DaoUnauthorized'
  );

  describe('plugin interface: ', async () => {
    it('does not support the empty interface', async () => {
      expect(await minter.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await minter.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `IPlugin` interface', async () => {
      const iface = IPlugin__factory.createInterface();
      expect(await minter.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `IMerkleMinter` interface', async () => {
      const iface = IMerkleMinter__factory.createInterface();
      expect(await minter.supportsInterface(getInterfaceID(iface))).to.be.true;
    });
  });

  describe('merkleMint:', () => {
    const dummyMerkleTreeStorageLink: string = '0x';
    const dummyMintingContext: string = '0x';

    it('mints tokens using the merkle distributor', async () => {
      // make a static call with merkleMint to get address of the cloned minter without changing state
      let clonedAddress = await minter.callStatic.merkleMint(
        merkleRoot,
        totalAmount,
        dummyMerkleTreeStorageLink,
        dummyMintingContext
      );

      // execute merkleMint and listen for the event containing the cloned address
      await expect(
        minter.merkleMint(
          merkleRoot,
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        )
      )
        .to.emit(minter, 'MerkleMinted')
        .withArgs(
          clonedAddress,
          merkleRoot,
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        );
    });

    it('does not mint if the minting permissionId on the minter is missing', async () => {
      await managingDao.revoke(
        minter.address,
        ownerAddress,
        MERKLE_MINT_PERMISSION_ID
      );

      await expect(
        minter.merkleMint(
          tree.getHexRoot(),
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        )
      )
        .to.be.revertedWithCustomError(minter, 'DaoUnauthorized')
        .withArgs(
          managingDao.address,
          minter.address,
          ownerAddress,
          MERKLE_MINT_PERMISSION_ID
        );
    });

    it('does not mint if the minting permissionId on the token is missing', async () => {
      await managingDao.revoke(
        token.address,
        minter.address,
        MINT_PERMISSION_ID
      );

      await expect(
        minter.merkleMint(
          tree.getHexRoot(),
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        )
      )
        .to.be.revertedWithCustomError(minter, 'DaoUnauthorized')
        .withArgs(
          managingDao.address,
          token.address,
          minter.address,
          MINT_PERMISSION_ID
        );
    });
  });
});
