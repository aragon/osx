import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  TestERC20,
  TestERC20__factory,
  GovernanceWrappedERC20,
  GovernanceWrappedERC20__factory,
  IERC165Upgradeable__factory,
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

const addressZero = ethers.constants.AddressZero;

let from: SignerWithAddress;
let to: SignerWithAddress;
let other: SignerWithAddress;
let toDelegate: string;

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

    from = signers[0];
    to = signers[1];
    other = signers[2];
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

    governanceToken = await GovernanceWrappedERC20.deploy(
      ...defaultGovernanceWrappedERC20InitData
    );
  });

  describe('initialize:', async () => {
    it('reverts if trying to re-initialize', async () => {
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

    it('should return default decimals if not modified', async () => {
      expect(await governanceToken.decimals()).to.eq(18);
    });

    it('should return modified decimals', async () => {
      const defaultDecimals = await erc20.decimals();
      erc20.setDecimals(5);
      expect(await governanceToken.decimals()).to.eq(5);
      erc20.setDecimals(defaultDecimals);
    });
  });

  describe('supportsInterface:', async () => {
    it('does not support the empty interface', async () => {
      expect(await governanceToken.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await governanceToken.supportsInterface(getInterfaceID(iface))).to
        .be.true;
    });

    it('it supports all inherited interfaces', async () => {
      await Promise.all(
        [
          'IGovernanceWrappedERC20',
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
        await governanceToken.getPastVotes(signers[0].address, tx1.blockNumber!)
      ).to.eq(0);
      expect(
        await governanceToken.getPastVotes(signers[1].address, tx1.blockNumber!)
      ).to.eq(balanceSigner1.add(balanceSigner0));
      expect(
        await governanceToken.getPastVotes(signers[2].address, tx1.blockNumber!)
      ).to.eq(balanceSigner2);
    });
  });

  describe('afterTokenTransfer', async () => {
    let token: GovernanceWrappedERC20;

    beforeEach(async () => {
      token = await GovernanceWrappedERC20.deploy(
        erc20.address,
        'name',
        'symbol'
      );

      await erc20.setBalance(signers[0].address, 200);
      await erc20.setBalance(signers[1].address, 200);
      await erc20.connect(signers[0]).approve(token.address, 200);
      await erc20.connect(signers[1]).approve(token.address, 200);
    });

    it('turns on delegation after mint', async () => {
      expect(await token.delegates(signers[0].address)).to.equal(addressZero);

      await expect(token.depositFor(signers[0].address, 1)).to.emit(
        token,
        'DelegateChanged'
      );

      expect(await token.delegates(signers[0].address)).to.equal(
        signers[0].address
      );
      expect(await token.getVotes(signers[0].address)).to.equal(1);
    });

    it('turns on delegation for the `to` address after transfer', async () => {
      // delegation turned on for signers[0]
      await token.depositFor(signers[0].address, 100);

      // At this time, signers[1] doesn't have delegation turned on,
      // but the transfer should turn it on.
      expect(await token.delegates(signers[1].address)).to.equal(addressZero);

      await expect(token.transfer(signers[1].address, 50)).to.emit(
        token,
        'DelegateChanged'
      );

      expect(await token.getVotes(signers[1].address)).to.equal(50);
      expect(await token.delegates(signers[1].address)).to.equal(
        signers[1].address
      );
    });

    it('turns on delegation for all users in the chain of transfer A => B => C', async () => {
      await token.depositFor(signers[0].address, 100);

      await expect(token.transfer(signers[1].address, 40)).to.emit(
        token,
        'DelegateChanged'
      );
      await expect(
        token.connect(signers[1]).transfer(signers[2].address, 20)
      ).to.emit(token, 'DelegateChanged');

      expect(await token.getVotes(signers[0].address)).to.equal(60);
      expect(await token.getVotes(signers[1].address)).to.equal(20);
      expect(await token.getVotes(signers[2].address)).to.equal(20);
    });

    it('should not turn on delegation on `transfer` if `to` manually turned it off', async () => {
      await token.depositFor(signers[0].address, 100);

      // turns on delegation for signers[1]
      await token.transfer(signers[1].address, 50);

      // turns off delegation for signers[1]
      await token.connect(signers[1]).delegate(addressZero);

      // shouldn't turn on delegation.
      await expect(token.transfer(signers[1].address, 50)).to.not.emit(
        token,
        'DelegateChanged'
      );

      expect(await token.delegates(signers[1].address)).to.equal(addressZero);
      expect(await token.getVotes(signers[1].address)).to.equal(0);
    });

    it('should not turn on delegation on `mint` if `to` manually turned it off', async () => {
      await token.depositFor(signers[0].address, 100);

      // turn off delegation
      await token.delegate(addressZero);

      await expect(token.depositFor(signers[0].address, 50)).to.not.emit(
        token,
        'DelegateChanged'
      );

      expect(await token.delegates(signers[0].address)).to.equal(addressZero);
      expect(await token.getVotes(signers[1].address)).to.equal(0);
    });

    it('should not rewrite delegation setting for `transfer` if user set it on before receiving tokens', async () => {
      await token.depositFor(signers[0].address, 10);

      // user1 delegated to user2.
      await token.connect(signers[1]).delegate(signers[2].address);

      // When user1 receives his first token, delegation to himself
      // shouldn't be called so it doesn't overwrite his setting.
      await expect(token.transfer(signers[1].address, 10)).to.not.emit(
        token,
        'DelegateChanged'
      );
    });

    it('should not rewrite delegation setting for `mint` if user set it on before receiving tokens', async () => {
      // user1 delegated to user2 before receiving tokens.
      await token.connect(signers[1]).delegate(signers[2].address);

      await expect(token.depositFor(signers[1].address, 10)).to.not.emit(
        token,
        'DelegateChanged'
      );
    });

    it('should not turn on delegation on `mint` if it was turned on at least once in the past', async () => {
      await token.depositFor(signers[0].address, 100);

      await expect(token.depositFor(signers[0].address, 100)).to.not.emit(
        token,
        'DelegateChanged'
      );

      expect(await token.getVotes(signers[0].address)).to.equal(200);
    });

    it('should not turn on delegation on `transfer` if it was turned on at least once in the past', async () => {
      await token.depositFor(signers[0].address, 100);

      await token.transfer(signers[1].address, 50);

      await expect(token.transfer(signers[1].address, 30)).to.not.emit(
        token,
        'DelegateChanged'
      );
      expect(await token.getVotes(signers[1].address)).to.equal(80);
    });

    it('updates voting power after transfer for `from` if delegation turned on', async () => {
      await token.depositFor(signers[0].address, 100);

      await token.transfer(signers[1].address, 30);

      expect(await token.getVotes(signers[0].address)).to.equal(70);
    });

    it('updates voting power after transfer for `to` if delegation turned on', async () => {
      await token.depositFor(signers[0].address, 100);

      await token.transfer(signers[1].address, 30);

      expect(await token.getVotes(signers[1].address)).to.equal(30);
    });

    context('exhaustive tests', async () => {
      context('`to` has a zero balance', async () => {
        beforeEach(async () => {
          expect(await token.balanceOf(to.address)).to.eq(0);
          toDelegate = addressZero;
        });

        context('`to` delegated to `other`', async () => {
          beforeEach(async () => {
            await expect(token.connect(to).delegate(other.address))
              .to.emit(token, 'DelegateChanged')
              .withArgs(to.address, addressZero, other.address);
            toDelegate = other.address;
          });

          context(
            '`to` receives via `depositFor` from `address(0)`',
            async () => {
              beforeEach(async () => {
                await expect(token.depositFor(to.address, 100)).to.not.emit(
                  token,
                  'DelegateChanged'
                );
              });

              it('`to` has the correct voting power', async () => {
                expect(await token.getVotes(to.address)).to.equal(0);
              });
              it('`to`s delegate has not changed', async () => {
                expect(await token.delegates(to.address)).to.equal(toDelegate);
              });
              it('`to`s delegate has the correct voting power', async () => {
                expect(await token.getVotes(toDelegate)).to.equal(100);
              });
            }
          );

          context('`to` receives via transfer from `from`', async () => {
            beforeEach(async () => {
              await token.depositFor(from.address, 100);
              await expect(
                token.connect(from).transfer(to.address, 100)
              ).to.not.emit(token, 'DelegateChanged');
            });

            it('`from` has the correct voting power', async () => {
              expect(await token.getVotes(from.address)).to.equal(0);
            });
            it('`from`s delegate has not changed', async () => {
              expect(await token.delegates(from.address)).to.equal(
                from.address
              );
            });
            it('`from`s delegate has the correct voting power', async () => {
              const fromDelegate = await token.delegates(from.address);
              expect(await token.getVotes(fromDelegate)).to.equal(0);
            });

            it('`to` has the correct voting power', async () => {
              expect(await token.getVotes(to.address)).to.equal(0);
            });
            it('`to`s delegate has not changed', async () => {
              expect(await token.delegates(to.address)).to.equal(toDelegate);
            });
            it('`to`s delegate has the correct voting power', async () => {
              expect(await token.getVotes(toDelegate)).to.equal(100);
            });
          });
        });

        context('`to` has not delegated before', async () => {
          context(
            '`to` receives via `depositFor` from `address(0)`',
            async () => {
              beforeEach(async () => {
                await expect(token.depositFor(to.address, 100))
                  .to.emit(token, 'DelegateChanged')
                  .withArgs(to.address, addressZero, to.address); // the mint triggers automatic self-delegation
                toDelegate = to.address;
              });

              it('`to` has the correct voting power', async () => {
                expect(await token.getVotes(to.address)).to.equal(100);
              });
              it('`to`s delegate has not changed', async () => {
                expect(await token.delegates(to.address)).to.equal(toDelegate);
              });
              it('`to`s delegate has the correct voting power', async () => {
                expect(await token.getVotes(toDelegate)).to.equal(100);
              });
            }
          );

          context('`to` receives via transfer from `from`', async () => {
            beforeEach(async () => {
              await token.depositFor(from.address, 100);
              await expect(token.connect(from).transfer(to.address, 100))
                .to.emit(token, 'DelegateChanged')
                .withArgs(to.address, addressZero, to.address); // the transfer triggers automatic self-delegation
              toDelegate = to.address;
            });

            it('`from` has the correct voting power', async () => {
              expect(await token.getVotes(from.address)).to.equal(0);
            });
            it('`from`s delegate has not changed', async () => {
              expect(await token.delegates(from.address)).to.equal(
                from.address
              );
            });
            it('`from`s delegate has the correct voting power', async () => {
              const fromDelegate = await token.delegates(from.address);
              expect(await token.getVotes(fromDelegate)).to.equal(0);
            });

            it('`to` has the correct voting power', async () => {
              expect(await token.getVotes(to.address)).to.equal(100);
            });
            it('`to`s delegate has not changed', async () => {
              expect(await token.delegates(to.address)).to.equal(toDelegate);
            });
            it('`to`s delegate has the correct voting power', async () => {
              expect(await token.getVotes(toDelegate)).to.equal(100);
            });
          });
        });
      });

      context('`to` has a non-zero balance', async () => {
        beforeEach(async () => {
          await expect(token.depositFor(to.address, 100))
            .to.emit(token, 'DelegateChanged')
            .withArgs(to.address, addressZero, to.address);
          toDelegate = to.address;
          expect(await token.balanceOf(to.address)).to.eq(100);
        });

        context('`to` delegated to `other`', async () => {
          beforeEach(async () => {
            await expect(token.connect(to).delegate(other.address))
              .to.emit(token, 'DelegateChanged')
              .withArgs(to.address, to.address, other.address); // this changes the delegate from himself (`to`) to `other`
            toDelegate = other.address;
          });

          context(
            '`to` receives via `depositFor` from `address(0)`',
            async () => {
              beforeEach(async () => {
                await expect(token.depositFor(to.address, 100)).to.not.emit(
                  token,
                  'DelegateChanged'
                );
              });

              it('`to` has the correct voting power', async () => {
                expect(await token.getVotes(to.address)).to.equal(0);
              });
              it('`to`s delegate has not changed', async () => {
                expect(await token.delegates(to.address)).to.equal(toDelegate);
              });
              it('`to`s delegate has the correct voting power', async () => {
                expect(await token.getVotes(toDelegate)).to.equal(200);
              });

              context('`to` transfers to `other`', async () => {
                beforeEach(async () => {
                  await expect(
                    token.connect(to).transfer(other.address, 100)
                  ).to.not.emit(token, 'DelegateChanged');
                });

                it('`to` has the correct voting power', async () => {
                  expect(await token.getVotes(to.address)).to.equal(0);
                });
                it('`to`s delegate has not changed', async () => {
                  expect(await token.delegates(to.address)).to.equal(
                    toDelegate
                  );
                });
                it('`to`s delegate has the correct voting power', async () => {
                  expect(await token.getVotes(toDelegate)).to.equal(100);
                });
              });

              context('`to` delegates to `other`', async () => {
                beforeEach(async () => {
                  await expect(token.connect(to).delegate(other.address))
                    .to.emit(token, 'DelegateChanged')
                    .withArgs(to.address, other.address, other.address); // `to` re-delegates to `other` again
                });

                it('`to` has the correct voting power', async () => {
                  expect(await token.getVotes(to.address)).to.equal(0);
                });
                it('`to`s delegate is correctly changed', async () => {
                  expect(await token.delegates(to.address)).to.equal(
                    other.address
                  );
                });
                it('`to`s delegate has the correct voting power', async () => {
                  expect(await token.getVotes(toDelegate)).to.equal(200);
                });
              });
            }
          );

          context('`to` receives via transfer from `from`', async () => {
            beforeEach(async () => {
              await token.depositFor(from.address, 100);
              await expect(
                token.connect(from).transfer(to.address, 100)
              ).to.not.emit(token, 'DelegateChanged');
            });

            it('`from` has the correct voting power', async () => {
              expect(await token.getVotes(from.address)).to.equal(0);
            });
            it('`from`s delegate has not changed', async () => {
              expect(await token.delegates(from.address)).to.equal(
                from.address
              );
            });
            it('`from`s delegate has the correct voting power', async () => {
              const fromDelegate = await token.delegates(from.address);
              expect(await token.getVotes(fromDelegate)).to.equal(0);
            });

            it('`to` has the correct voting power', async () => {
              expect(await token.getVotes(to.address)).to.equal(0);
            });
            it('`to`s delegate has not changed', async () => {
              expect(await token.delegates(to.address)).to.equal(other.address);
            });
            it('`to`s delegate has the correct voting power', async () => {
              expect(await token.getVotes(toDelegate)).to.equal(200);
            });

            context('`to` transfers to `other`', async () => {
              beforeEach(async () => {
                await expect(
                  token.connect(to).transfer(other.address, 100)
                ).to.not.emit(token, 'DelegateChanged');
              });

              it('`to` has the correct voting power', async () => {
                expect(await token.getVotes(to.address)).to.equal(0);
              });
              it('`to`s delegate has not changed', async () => {
                expect(await token.delegates(to.address)).to.equal(toDelegate);
              });
              it('`to`s delegate has the correct voting power', async () => {
                expect(await token.getVotes(toDelegate)).to.equal(100);
              });
            });

            context('`to` delegates to `other`', async () => {
              beforeEach(async () => {
                await expect(token.connect(to).delegate(other.address))
                  .to.emit(token, 'DelegateChanged')
                  .withArgs(to.address, other.address, other.address); // `to` re-delegates to `other` again
              });

              it('`to` has the correct voting power', async () => {
                expect(await token.getVotes(to.address)).to.equal(0);
              });
              it('`to`s delegate is correctly changed', async () => {
                expect(await token.delegates(to.address)).to.equal(toDelegate);
              });
              it('`to`s delegate has the correct voting power', async () => {
                expect(await token.getVotes(toDelegate)).to.equal(200);
              });
            });
          });
        });

        context('`to` has not delegated before', async () => {
          context(
            '`to` receives via `depositFor` from `address(0)`',
            async () => {
              beforeEach(async () => {
                await expect(token.depositFor(to.address, 100)).to.not.emit(
                  token,
                  'DelegateChanged'
                );
              });

              it('`to` has the correct voting power', async () => {
                expect(await token.getVotes(to.address)).to.equal(200);
              });
              it('`to`s delegate has not changed', async () => {
                expect(await token.delegates(to.address)).to.equal(toDelegate);
              });
              it('`to`s delegate has the correct voting power', async () => {
                expect(await token.getVotes(toDelegate)).to.equal(200);
              });

              context('`to` transfers to `other`', async () => {
                beforeEach(async () => {
                  await expect(token.connect(to).transfer(other.address, 100))
                    .to.emit(token, 'DelegateChanged')
                    .withArgs(other.address, addressZero, other.address); // the transfer triggers automatic self-delegation for `other`
                });

                it('`to` has the correct voting power', async () => {
                  expect(await token.getVotes(to.address)).to.equal(100); // 100 tokens are still left
                });
                it('`to`s delegate has not changed', async () => {
                  expect(await token.delegates(to.address)).to.equal(
                    toDelegate
                  );
                });
                it('`to`s delegate has the correct voting power', async () => {
                  expect(await token.getVotes(toDelegate)).to.equal(100);
                });
              });

              context('`to` delegates to `other`', async () => {
                beforeEach(async () => {
                  await expect(token.connect(to).delegate(other.address))
                    .to.emit(token, 'DelegateChanged')
                    .withArgs(to.address, to.address, other.address); // `to` delegates to `other`
                  toDelegate = other.address;
                });

                it('`to` has the correct voting power', async () => {
                  expect(await token.getVotes(to.address)).to.equal(0);
                });
                it('`to`s delegate is correctly changed', async () => {
                  expect(await token.delegates(to.address)).to.equal(
                    toDelegate
                  );
                });
                it('`to`s delegate has the correct voting power', async () => {
                  expect(await token.getVotes(toDelegate)).to.equal(200);
                });
              });
            }
          );

          context('`to` receives via transfer from `from`', async () => {
            beforeEach(async () => {
              await token.depositFor(from.address, 100);
              await expect(
                token.connect(from).transfer(to.address, 100)
              ).to.not.emit(token, 'DelegateChanged');
            });

            it('`from` has the correct voting power', async () => {
              expect(await token.getVotes(from.address)).to.equal(0);
            });
            it('`from`s delegate has not changed', async () => {
              expect(await token.delegates(from.address)).to.equal(
                from.address
              );
            });
            it('`from`s delegate has the correct voting power', async () => {
              const fromDelegate = await token.delegates(from.address);
              expect(await token.getVotes(fromDelegate)).to.equal(0);
            });

            it('`to` has the correct voting power', async () => {
              expect(await token.getVotes(to.address)).to.equal(200);
            });
            it('`to`s delegate has not changed', async () => {
              expect(await token.delegates(to.address)).to.equal(toDelegate);
            });
            it('`to`s delegate has the correct voting power', async () => {
              expect(await token.getVotes(toDelegate)).to.equal(200);
            });

            context('`to` transfers to `other`', async () => {
              beforeEach(async () => {
                await expect(token.connect(to).transfer(other.address, 100))
                  .to.emit(token, 'DelegateChanged')
                  .withArgs(other.address, addressZero, other.address);
              });

              it('`to` has the correct voting power', async () => {
                expect(await token.getVotes(to.address)).to.equal(100);
              });
              it('`to`s delegate has not changed', async () => {
                expect(await token.delegates(to.address)).to.equal(toDelegate);
              });
              it('`to`s delegate has the correct voting power', async () => {
                expect(await token.getVotes(toDelegate)).to.equal(100);
              });
            });

            context('`to` delegates to `other`', async () => {
              beforeEach(async () => {
                await expect(token.connect(to).delegate(other.address))
                  .to.emit(token, 'DelegateChanged')
                  .withArgs(to.address, to.address, other.address); // `to` delegates to `other`
                toDelegate = other.address;
              });

              it('`to` has the correct voting power', async () => {
                expect(await token.getVotes(to.address)).to.equal(0);
              });
              it('`to`s delegate is correctly changed', async () => {
                expect(await token.delegates(to.address)).to.equal(toDelegate);
              });
              it('`to`s delegate has the correct voting power', async () => {
                expect(await token.getVotes(toDelegate)).to.equal(200);
              });
            });
          });
        });
      });
    });
  });
});
