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
} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';
import BalanceTree from './src/balance-tree';

const MERKLE_MINT_PERMISSION_ID = ethers.utils.id('MERKLE_MINT_PERMISSION');
const MINT_PERMISSION_ID = ethers.utils.id('MINT_PERMISSION');

describe('MerkleDistributor', function () {
  let signers: SignerWithAddress[];
  let minter: MerkleMinter;
  let distributor: MerkleDistributor;
  let managingDao: DAO;
  let token: GovernanceERC20;
  let ownerAddress: string;

  let tree: BalanceTree;
  let merkleRoot: string;
  let totalAmount: BigNumber;

  beforeEach(async () => {
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
    const DAO = await ethers.getContractFactory('DAO');
    managingDao = await DAO.deploy();
    await managingDao.initialize(
      '0x',
      ownerAddress,
      ethers.constants.AddressZero
    );

    const GovernanceERC20 = await ethers.getContractFactory('GovernanceERC20');
    token = await GovernanceERC20.deploy(managingDao.address, 'GOV', 'GOV');

    const MerkleDistributor = await ethers.getContractFactory(
      'MerkleDistributor'
    );
    distributor = await MerkleDistributor.deploy();

    const MerkleMinter = await ethers.getContractFactory('MerkleMinter');
    minter = await MerkleMinter.deploy();
    await minter.initialize(
      managingDao.address,
      token.address,
      distributor.address
    );
    await managingDao.grant(
      minter.address,
      ownerAddress,
      MERKLE_MINT_PERMISSION_ID
    );
    await managingDao.grant(token.address, minter.address, MINT_PERMISSION_ID);
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
      expect(
        await minter.merkleMint(
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
      ).to.be.revertedWith(
        customError(
          'DaoUnauthorized',
          managingDao.address,
          minter.address,
          minter.address,
          ownerAddress,
          MERKLE_MINT_PERMISSION_ID
        )
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
      ).to.be.revertedWith(
        customError(
          'DaoUnauthorized',
          managingDao.address,
          token.address,
          token.address,
          minter.address,
          MINT_PERMISSION_ID
        )
      );
    });
  });
});
