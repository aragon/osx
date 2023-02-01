import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  TestERC20,
  TestERC20__factory,
  GovernanceWrappedERC20,
  GovernanceWrappedERC20__factory,
} from '../../../typechain';
import {OZ_ERRORS} from '../../test-utils/error';
import {getInterfaceID} from '../../test-utils/interfaces';

export type AccountBalance = {account: string; amount: number};

export type MintSettings = {
  receivers: string[];
  amounts: number[];
};

const existingErc20Name = 'Token';
const existingErc20Symbol = 'TOK';

const governanceWrappedERC20Name = 'GovernanceWrappedToken';
const governanceWrappedERC20Symbol = 'gwTOK';

describe('GovernanceWrappedERC20', function () {
  let signers: SignerWithAddress[];
  let governanceToken: GovernanceWrappedERC20;
  let erc20: TestERC20;
  let TestERC20: TestERC20__factory;
  let GovernanceWrappedERC20: GovernanceWrappedERC20__factory;
  let defaultBalances: AccountBalance[];

  let defaultExistingERC20InitData: [string, string, number];
  let defaultGovernanceWrappedERC20InitData: [string, string, string];

  before(async () => {
    signers = await ethers.getSigners();

    TestERC20 = await ethers.getContractFactory('TestERC20');
    GovernanceWrappedERC20 = await ethers.getContractFactory(
      'GovernanceWrappedERC20'
    );
    defaultBalances = [
      {account: signers[0].address, amount: 123},
      {account: signers[1].address, amount: 456},
      {account: signers[2].address, amount: 789},
    ];
  });

  beforeEach(async function () {
    defaultExistingERC20InitData = [existingErc20Name, existingErc20Symbol, 0];
    erc20 = await TestERC20.deploy(...defaultExistingERC20InitData);

    const promises = defaultBalances.map(balance =>
      erc20.setBalance(balance.account, balance.amount)
    );
    await Promise.all(promises);

    defaultGovernanceWrappedERC20InitData = [
      erc20.address,
      governanceWrappedERC20Name,
      governanceWrappedERC20Symbol,
    ];
  });

  describe('initialize:', async () => {
    it('reverts if trying to re-initialize', async () => {
      erc20 = await TestERC20.deploy(...defaultExistingERC20InitData);

      governanceToken = await GovernanceWrappedERC20.deploy(
        ...defaultGovernanceWrappedERC20InitData
      );

      await expect(
        governanceToken.initialize(...defaultGovernanceWrappedERC20InitData)
      ).to.be.revertedWith(OZ_ERRORS.ALREADY_INITIALIZED);
    });

    it('sets the wrapped token name and symbol', async () => {
      governanceToken = await GovernanceWrappedERC20.deploy(
        ...defaultGovernanceWrappedERC20InitData
      );

      expect(await governanceToken.name()).to.eq(governanceWrappedERC20Name);
      expect(await governanceToken.symbol()).to.eq(
        governanceWrappedERC20Symbol
      );
    });
  });

  describe('supportsInterface:', async () => {
    it('it supports all inherited interfaces', async () => {
      governanceToken = await GovernanceWrappedERC20.deploy(
        ...defaultGovernanceWrappedERC20InitData
      );

      await Promise.all(
        [
          'IGovernanceWrappedERC20',
          'IERC165Upgradeable',
          'IERC20Upgradeable',
          'IERC20PermitUpgradeable',
          'IVotesUpgradeable',
        ].map(async interfaceName => {
          const iface = new ethers.utils.Interface(
            // @ts-ignore
            (await hre.artifacts.readArtifact(interfaceName)).abi
          );
          expect(await governanceToken.supportsInterface(getInterfaceID(iface)))
            .to.be.true;
        })
      );
      // We must check `IERC20MetadataUpgradeable` separately as it inherits from `IERC20Upgradeable` and we cannot get the isolated ABI.
      const ierc20MetadataInterface = new ethers.utils.Interface([
        'function name()',
        'function symbol()',
        'function decimals()',
      ]);
      expect(
        await governanceToken.supportsInterface(
          getInterfaceID(ierc20MetadataInterface)
        )
      ).to.be.true;
    });
  });

  describe('depositFor', async () => {
    beforeEach(async function () {
      governanceToken = await GovernanceWrappedERC20.deploy(
        ...defaultGovernanceWrappedERC20InitData
      );
    });

    it('reverts if the amount is not approved', async () => {
      const erc20Balance = await erc20.balanceOf(signers[0].address);
      await expect(
        governanceToken.depositFor(signers[0].address, erc20Balance)
      ).to.be.revertedWith(OZ_ERRORS.ERC20_INSUFFICIENT_ALLOWANCE);
    });

    it('deposits an amount of tokens', async () => {
      // check old balances
      const erc20Balance = await erc20.balanceOf(signers[0].address);
      const governanceTokenBalance = await governanceToken.balanceOf(
        signers[0].address
      );
      expect(erc20Balance).to.eq(123);
      expect(governanceTokenBalance).to.eq(0);

      // wrap 100 erc20 tokens from signers[0] for signers[0]
      const depositAmount = 100;
      await erc20.approve(governanceToken.address, depositAmount);
      await governanceToken.depositFor(signers[0].address, depositAmount);

      // check new balances
      expect(await erc20.balanceOf(signers[0].address)).to.eq(
        erc20Balance.sub(depositAmount)
      );
      expect(await governanceToken.balanceOf(signers[0].address)).to.eq(
        governanceTokenBalance.add(depositAmount)
      );
    });

    it('updates the available votes', async () => {
      const erc20Balance = await erc20.balanceOf(signers[0].address);
      await erc20.approve(governanceToken.address, erc20Balance);

      // send the entire balance
      await governanceToken.depositFor(signers[0].address, erc20Balance);

      expect(await governanceToken.balanceOf(signers[0].address)).to.eq(
        erc20Balance
      );
      expect(await governanceToken.getVotes(signers[0].address)).to.eq(
        erc20Balance
      );
    });
  });

  describe('withdrawTo', async () => {
    beforeEach(async function () {
      governanceToken = await GovernanceWrappedERC20.deploy(
        ...defaultGovernanceWrappedERC20InitData
      );

      const erc20Balance = await erc20.balanceOf(signers[0].address);
      await erc20.approve(governanceToken.address, erc20Balance);
      await governanceToken.depositFor(signers[0].address, erc20Balance);
    });

    it('withdraws an amount of tokens', async () => {
      // check old balances
      const erc20Balance = await erc20.balanceOf(signers[0].address);
      const governanceTokenBalance = await governanceToken.balanceOf(
        signers[0].address
      );
      expect(erc20Balance).to.eq(0);
      expect(governanceTokenBalance).to.eq(123);

      // unwrap 100 governance tokens from signers[0] for signers[0]
      const withdrawAmount = 100;
      await erc20.approve(governanceToken.address, withdrawAmount);
      await governanceToken.withdrawTo(signers[0].address, withdrawAmount);

      // check new balances
      expect(await erc20.balanceOf(signers[0].address)).to.eq(
        erc20Balance.add(withdrawAmount)
      );
      expect(await governanceToken.balanceOf(signers[0].address)).to.eq(
        governanceTokenBalance.sub(withdrawAmount)
      );
      expect(await governanceToken.balanceOf(signers[0].address)).to.eq(
        governanceTokenBalance.sub(withdrawAmount)
      );
    });

    it('updates the available votes', async () => {
      const governanceTokenBalance = await governanceToken.balanceOf(
        signers[0].address
      );

      await governanceToken.withdrawTo(
        signers[0].address,
        governanceTokenBalance
      );

      expect(await governanceToken.balanceOf(signers[0].address)).to.eq(0);
      expect(await governanceToken.getVotes(signers[0].address)).to.eq(0);
    });
  });

  describe('delegate', async () => {
    beforeEach(async function () {
      governanceToken = await GovernanceWrappedERC20.deploy(
        ...defaultGovernanceWrappedERC20InitData
      );

      // approve and deposit for all token holders
      let promises = defaultBalances.map(balance =>
        erc20.approve(balance.account, balance.amount)
      );

      await Promise.all(promises);
    });

    it('delegates voting power to another account', async () => {
      const balanceSigner0 = await governanceToken.balanceOf(
        signers[0].address
      );
      const balanceSigner1 = await governanceToken.balanceOf(
        signers[1].address
      );

      // delegate the votes of signers[0] to signers[1]
      await governanceToken.connect(signers[0]).delegate(signers[1].address);

      // signers[0] delegates to signers[1]
      expect(await governanceToken.delegates(signers[0].address)).to.eq(
        signers[1].address
      );

      // signers[1] has not wrapped yet and therefore `delegates` is set to `address(0)`
      expect(await governanceToken.delegates(signers[1].address)).to.eq(
        ethers.constants.AddressZero
      );

      // balances remain the same
      expect(await governanceToken.balanceOf(signers[0].address)).to.eq(
        balanceSigner0
      );
      expect(await governanceToken.balanceOf(signers[1].address)).to.eq(
        balanceSigner1
      );

      // the voting power changes
      expect(await governanceToken.getVotes(signers[0].address)).to.eq(0);
      expect(await governanceToken.getVotes(signers[1].address)).to.eq(
        balanceSigner1.add(balanceSigner0)
      );
    });

    it('is checkpointed', async () => {
      const balanceSigner0 = await governanceToken.balanceOf(
        signers[0].address
      );
      const balanceSigner1 = await governanceToken.balanceOf(
        signers[1].address
      );
      const balanceSigner2 = await governanceToken.balanceOf(
        signers[2].address
      );

      let tx1 = await governanceToken
        .connect(signers[0])
        .delegate(signers[1].address);
      await ethers.provider.send('evm_mine', []);

      // verify that current votes are correct
      expect(await governanceToken.getVotes(signers[0].address)).to.eq(0);
      expect(await governanceToken.getVotes(signers[1].address)).to.eq(
        balanceSigner1.add(balanceSigner0)
      );
      expect(await governanceToken.getVotes(signers[2].address)).to.eq(
        balanceSigner2
      );

      let tx2 = await governanceToken
        .connect(signers[0])
        .delegate(signers[2].address);
      await ethers.provider.send('evm_mine', []);

      // verify that current votes are correct
      expect(await governanceToken.getVotes(signers[0].address)).to.eq(0);
      expect(await governanceToken.getVotes(signers[1].address)).to.eq(
        balanceSigner1
      );
      expect(await governanceToken.getVotes(signers[2].address)).to.eq(
        balanceSigner2.add(balanceSigner0)
      );

      // verify that past votes are correct
      expect(
        await governanceToken.getPastVotes(signers[0].address, tx1.blockNumber)
      ).to.eq(0);
      expect(
        await governanceToken.getPastVotes(signers[1].address, tx1.blockNumber)
      ).to.eq(balanceSigner1.add(balanceSigner0));
      expect(
        await governanceToken.getPastVotes(signers[2].address, tx1.blockNumber)
      ).to.eq(balanceSigner2);
    });
  });
});
