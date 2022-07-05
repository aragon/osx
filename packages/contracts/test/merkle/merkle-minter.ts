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

const MERKLE_MINTER_ROLE = ethers.utils.id('MERKLE_MINTER_ROLE');
const TOKEN_MINTER_ROLE = ethers.utils.id('TOKEN_MINTER_ROLE');

describe('MerkleDistributor', function () {
  let signers: SignerWithAddress[];
  let minter: MerkleMinter;
  let distributor: MerkleDistributor;
  let dao: DAO;
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
    dao = await DAO.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);

    const GovernanceERC20 = await ethers.getContractFactory('GovernanceERC20');
    token = await GovernanceERC20.deploy();
    await token.initialize(dao.address, 'GOV', 'GOV');

    const MerkleDistributor = await ethers.getContractFactory(
      'MerkleDistributor'
    );
    distributor = await MerkleDistributor.deploy();

    const MerkleMinter = await ethers.getContractFactory('MerkleMinter');
    minter = await MerkleMinter.deploy();
    await minter.initialize(
      dao.address,
      ethers.constants.AddressZero,
      token.address,
      distributor.address
    );
    await dao.grant(minter.address, ownerAddress, MERKLE_MINTER_ROLE);
    await dao.grant(token.address, minter.address, TOKEN_MINTER_ROLE);
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
        .to.emit(minter, 'MintedMerkle')
        .withArgs(
          clonedAddress,
          merkleRoot,
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        );
    });

    it('does not mint if the minting role on the minter is missing', async () => {
      await dao.revoke(minter.address, ownerAddress, MERKLE_MINTER_ROLE);

      await expect(
        minter.merkleMint(
          tree.getHexRoot(),
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        )
      ).to.be.revertedWith(
        customError(
          'ACLAuth',
          minter.address,
          minter.address,
          ownerAddress,
          MERKLE_MINTER_ROLE
        )
      );
    });

    it('does not mint if the minting role on the token is missing', async () => {
      await dao.revoke(token.address, minter.address, TOKEN_MINTER_ROLE);

      await expect(
        minter.merkleMint(
          tree.getHexRoot(),
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        )
      ).to.be.revertedWith(
        customError(
          'ACLAuth',
          token.address,
          token.address,
          minter.address,
          TOKEN_MINTER_ROLE
        )
      );
    });
  });
});
