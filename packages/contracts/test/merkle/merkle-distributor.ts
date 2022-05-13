// Copied and modified from: https://github.com/Uniswap/merkle-distributor/blob/master/test/MerkleDistributor.spec.ts

import chai, { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import Ganache from 'ganache';
import chaiUtils from '../test-utils';
import { customError } from '../test-utils/custom-error-helper';
import { BigNumber } from 'ethers'
import BalanceTree from './src/balance-tree'
import { parseBalanceMap } from './src/parse-balance-map'

chai.use(chaiUtils);

import { MerkleDistributor, DAO, TestERC20 } from '../../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

const overrides = {
  gasLimit: 9999999,
}

describe('MerkleDistributor', function () {
  let signers: SignerWithAddress[];
  let distributor: MerkleDistributor;
  let dao: DAO;
  let token: TestERC20;
  let wallet0: string;
  let wallet1: string;

  beforeEach(async () => {

    signers = await ethers.getSigners();
    wallet0 = await signers[0].getAddress();
    wallet1 = await signers[1].getAddress();

    // create a DAO
    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x', wallet0, ethers.constants.AddressZero);

    const TestERC20 = await ethers.getContractFactory('TestERC20');
    token = await TestERC20.deploy("FOO", "FOO", 0); // mint 0 FOO tokens

    const MerkleDistributor = await ethers.getContractFactory('MerkleDistributor');
    distributor = await MerkleDistributor.deploy();
  });

  describe('general', () => {
    const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

    beforeEach(async () => {    
      await distributor.initialize(dao.address, ethers.constants.AddressZero, token.address, ZERO_BYTES32);
    });

    describe('#token', () => {
    it('returns the token address', async () => {
      expect(await distributor.token()).to.eq(token.address)
      })
    })

    describe('#merkleRoot', () => {
        it('returns the zero merkle root', async () => {
        expect(await distributor.merkleRoot()).to.eq(ZERO_BYTES32)
        })
    })

    describe('#claim', () => {
        it('fails for empty proof', async () => {
        await expect(distributor.claim(0, wallet0, 10, [])).to.be.revertedWith(
            customError('DistTokenClaimInvalid', 0, wallet0, 10)
        )
        })

        it('fails for invalid index', async () => {
        await expect(distributor.claim(0, wallet0, 10, [])).to.be.revertedWith(
            customError('DistTokenClaimInvalid', 0, wallet0, 10)
        )
        })
    });
  })

  describe('two account tree', () => {
    let tree: BalanceTree
    beforeEach('deploy', async () => {
      tree = new BalanceTree([
        { account: wallet0, amount: BigNumber.from(100) },
        { account: wallet1, amount: BigNumber.from(101) },
      ])
      
      await distributor.initialize(dao.address, ethers.constants.AddressZero, token.address, tree.getHexRoot());
      await token.setBalance(distributor.address, 201)
    })

    it('successful claim', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100))
      await expect(distributor.claim(0, wallet0, 100, proof0, overrides))
        .to.emit(distributor, 'Claimed')
        .withArgs(0, wallet0, 100)
      const proof1 = tree.getProof(1, wallet1, BigNumber.from(101))
      await expect(distributor.claim(1, wallet1, 101, proof1, overrides))
        .to.emit(distributor, 'Claimed')
        .withArgs(1, wallet1, 101)
    })

    it('transfers the token', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100))
      expect(await token.balanceOf(wallet0)).to.eq(0)
      await distributor.claim(0, wallet0, 100, proof0, overrides)
      expect(await token.balanceOf(wallet0)).to.eq(100)
    })

    it('must have enough to transfer', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100))
      await token.setBalance(distributor.address, 99)
      await expect(distributor.claim(0, wallet0, 100, proof0, overrides)).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      )
    })

    it('sets #isClaimed', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100))
      expect(await distributor.isClaimed(0)).to.eq(false)
      expect(await distributor.isClaimed(1)).to.eq(false)
      await distributor.claim(0, wallet0, 100, proof0, overrides)
      expect(await distributor.isClaimed(0)).to.eq(true)
      expect(await distributor.isClaimed(1)).to.eq(false)
    })

    it('cannot allow two claims', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100))
      await distributor.claim(0, wallet0, 100, proof0, overrides)
      await expect(
        distributor.claim(0, wallet0, 100, proof0, overrides)
      ).to.be.revertedWith(customError('DistTokenClaimedAlready',0));
    })

    it('cannot claim more than once: 0 and then 1', async () => {
      await distributor.claim(
        0,
        wallet0,
        100,
        tree.getProof(0, wallet0, BigNumber.from(100)),
        overrides
      )
      await distributor.claim(
        1,
        wallet1,
        101,
        tree.getProof(1, wallet1, BigNumber.from(101)),
        overrides
      )

      await expect(
        distributor.claim(0, wallet0, 100, tree.getProof(0, wallet0, BigNumber.from(100)), overrides)
      ).to.be.revertedWith(customError('DistTokenClaimedAlready',0));
    })

    it('cannot claim more than once: 1 and then 0', async () => {
      await distributor.claim(
        1,
        wallet1,
        101,
        tree.getProof(1, wallet1, BigNumber.from(101)),
        overrides
      )
      await distributor.claim(
        0,
        wallet0,
        100,
        tree.getProof(0, wallet0, BigNumber.from(100)),
        overrides
      )

      await expect(
        distributor.claim(1, wallet1, 101, tree.getProof(1, wallet1, BigNumber.from(101)), overrides)
      ).to.be.revertedWith(customError('DistTokenClaimedAlready',1));
    })

    it('cannot claim for address other than proof', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100))
      await expect(
          distributor.claim(1, wallet1, 101, proof0, overrides
      )).to.be.revertedWith(customError('DistTokenClaimInvalid', 1, wallet1, 101))
    })

    it('cannot claim more than proof', async () => {
      const proof0 = tree.getProof(0, wallet0, BigNumber.from(100))
      await expect(
        distributor.claim(0, wallet0, 101, proof0, overrides)
      ).to.be.revertedWith(customError('DistTokenClaimInvalid', 0, wallet0, 101));
    })

    //TODO remove
    it('gas', async () => {
      const proof = tree.getProof(0, wallet0, BigNumber.from(100))
      const tx = await distributor.claim(0, wallet0, 100, proof, overrides)
      const receipt = await tx.wait()
      expect(receipt.gasUsed).to.eq(86724)
    })
})

describe('larger tree', () => {
    let tree: BalanceTree
    beforeEach('deploy', async () => {
      tree = new BalanceTree(
        signers.map((wallet, ix) => {
          return { account: wallet.address, amount: BigNumber.from(ix + 1) }
        })
      )
      await distributor.initialize(dao.address, ethers.constants.AddressZero, token.address, tree.getHexRoot());
      await token.setBalance(distributor.address, 201)
    })

    it('claim index 4', async () => {
      const proof = tree.getProof(4, signers[4].address, BigNumber.from(5))
      await expect(distributor.claim(4, signers[4].address, 5, proof, overrides))
        .to.emit(distributor, 'Claimed')
        .withArgs(4, signers[4].address, 5)
    })

    it('claim index 9', async () => {
      const proof = tree.getProof(9, signers[9].address, BigNumber.from(10))
      await expect(distributor.claim(9, signers[9].address, 10, proof, overrides))
        .to.emit(distributor, 'Claimed')
        .withArgs(9, signers[9].address, 10)
    })

    //TODO remove
    it('gas', async () => {
      const proof = tree.getProof(9, signers[9].address, BigNumber.from(10))
      const tx = await distributor.claim(9, signers[9].address, 10, proof, overrides)
      const receipt = await tx.wait()
      expect(receipt.gasUsed).to.eq(89938)
    })

    it('gas second down about 17k', async () => {
      await distributor.claim(
        0,
        signers[0].address,
        1,
        tree.getProof(0, signers[0].address, BigNumber.from(1)),
        overrides
      )
      const tx = await distributor.claim(
        1,
        signers[1].address,
        2,
        tree.getProof(1, signers[1].address, BigNumber.from(2)),
        overrides
      )
      const receipt = await tx.wait()
      expect(receipt.gasUsed).to.eq(72838)
    })
})
/*
describe('realistic size tree', () => {
    let tree: BalanceTree
    const NUM_LEAVES = 100_000
    const NUM_SAMPLES = 25
    const elements: { account: string; amount: BigNumber }[] = []
    for (let i = 0; i < NUM_LEAVES; i++) {
      const node = { account: wallet0, amount: BigNumber.from(100) }
      elements.push(node)
    }
    tree = new BalanceTree(elements)

    it('proof verification works', () => {
      const root = Buffer.from(tree.getHexRoot().slice(2), 'hex')
      for (let i = 0; i < NUM_LEAVES; i += NUM_LEAVES / NUM_SAMPLES) {
        const proof = tree
          .getProof(i, wallet0, BigNumber.from(100))
          .map((el) => Buffer.from(el.slice(2), 'hex'))
        const validProof = BalanceTree.verifyProof(i, wallet0, BigNumber.from(100), proof, root)
        expect(validProof).to.be.true
      }
    })

    beforeEach('deploy', async () => {
      await distributor.initialize(dao.address, ethers.constants.AddressZero, token.address, tree.getHexRoot());
      await token.setBalance(distributor.address, constants.MaxUint256)
    })

    it('gas', async () => {
      const proof = tree.getProof(50000, wallet0, BigNumber.from(100))
      const tx = await distributor.claim(50000, wallet0, 100, proof, overrides)
      const receipt = await tx.wait()
      expect(receipt.gasUsed).to.eq(91650)
    })
    it('gas deeper node', async () => {
      const proof = tree.getProof(90000, wallet0, BigNumber.from(100))
      const tx = await distributor.claim(90000, wallet0, 100, proof, overrides)
      const receipt = await tx.wait()
      expect(receipt.gasUsed).to.eq(91586)
    })
    it('gas average random distribution', async () => {
      let total: BigNumber = BigNumber.from(0)
      let count: number = 0
      for (let i = 0; i < NUM_LEAVES; i += NUM_LEAVES / NUM_SAMPLES) {
        const proof = tree.getProof(i, wallet0, BigNumber.from(100))
        const tx = await distributor.claim(i, wallet0, 100, proof, overrides)
        const receipt = await tx.wait()
        total = total.add(receipt.gasUsed)
        count++
      }
      const average = total.div(count)
      expect(average).to.eq(77075)
    })
    // this is what we gas golfed by packing the bitmap
    it('gas average first 25', async () => {
      let total: BigNumber = BigNumber.from(0)
      let count: number = 0
      for (let i = 0; i < 25; i++) {
        const proof = tree.getProof(i, wallet0, BigNumber.from(100))
        const tx = await distributor.claim(i, wallet0, 100, proof, overrides)
        const receipt = await tx.wait()
        total = total.add(receipt.gasUsed)
        count++
      }
      const average = total.div(count)
      expect(average).to.eq(62824)
    })

    it('no double claims in random distribution', async () => {
      for (let i = 0; i < 25; i += Math.floor(Math.random() * (NUM_LEAVES / NUM_SAMPLES))) {
        const proof = tree.getProof(i, wallet0, BigNumber.from(100))
        await distributor.claim(i, wallet0, 100, proof, overrides)
        await expect(distributor.claim(i, wallet0, 100, proof, overrides)).to.be.revertedWith(
          'MerkleDistributor: Drop already claimed.'
        )
      }
    })
})
*/

describe('parseBalanceMap', () => {
  let addr0: string;
  let addr1: string;
  let addr2: string;
  let distributorAsSigner0: MerkleDistributor

  let claims: {
    [account: string]: {
      index: number
      amount: string
      proof: string[]
    }
  }
  beforeEach('deploy', async () => {
    const ganache = Ganache.provider({
        hardfork: 'istanbul',
        mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
        //gasLimit: 9999999,
      });
    const provider = new ethers.providers.Web3Provider(ganache as any);
    const accounts = await provider.listAccounts();
    
    const addr0 = accounts[0];
    const addr1 = accounts[1];
    const addr2 = accounts[2];

    const { claims: innerClaims, merkleRoot, tokenTotal } = parseBalanceMap({
      [addr0]: 200,
      [addr1]: 300,
      [addr2]: 250,
    })
    expect(tokenTotal).to.eq('0x02ee') // 750
    claims = innerClaims
    
    console.log(claims)

    distributorAsSigner0 = distributor.connect(provider.getSigner(0));
    await distributorAsSigner0.initialize(dao.address, ethers.constants.AddressZero, token.address, merkleRoot);
  })
  
  it('check the proofs is as expected', () => {
    expect(claims).to.deep.eq({
      [addr0]: {
        index: 0,
        amount: '0xc8',
        proof: ['0x2a411ed78501edb696adca9e41e78d8256b61cfac45612fa0434d7cf87d916c6'],
      },
      [addr1]: {
        index: 1,
        amount: '0x012c',
        proof: [
          '0xbfeb956a3b705056020a3b64c540bff700c0f6c96c55c0a5fcab57124cb36f7b',
          '0xd31de46890d4a77baeebddbd77bf73b5c626397b73ee8c69b51efe4c9a5a72fa',
        ],
      },
      [addr2]: {
        index: 2,
        amount: '0xfa',
        proof: [
          '0xceaacce7533111e902cc548e961d77b23a4d8cd073c6b68ccf55c62bd47fc36b',
          '0xd31de46890d4a77baeebddbd77bf73b5c626397b73ee8c69b51efe4c9a5a72fa',
        ],
      },
    })
  })

  it('all claims work exactly once', async () => {
    for (let account in claims) {
      const claim = claims[account]
      await expect(
        distributorAsSigner0.claim(claim.index, account, claim.amount, claim.proof, overrides)
      )
      .to.emit(distributorAsSigner0, 'Claimed')
      .withArgs(claim.index, account, claim.amount)
      
      await expect(
        distributorAsSigner0.claim(claim.index, account, claim.amount, claim.proof, overrides)
      ).to.be.revertedWith(
        customError('DistTokenClaimedAlready', claim.index)
      )
    }
    expect(await token.balanceOf(distributorAsSigner0.address)).to.eq(0)
  });
});
});
