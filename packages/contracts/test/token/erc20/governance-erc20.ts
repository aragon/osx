import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAO,
  GovernanceERC20,
  GovernanceERC20__factory,
  IERC165Upgradeable__factory,
} from '../../../typechain';
import {deployNewDAO} from '../../test-utils/dao';
import {OZ_ERRORS} from '../../test-utils/error';
import {getInterfaceID} from '../../test-utils/interfaces';

export type MintSettings = {
  receivers: string[];
  amounts: number[];
};

const MINT_PERMISSION_ID = ethers.utils.id('MINT_PERMISSION');
const governanceERC20Name = 'GovernanceToken';
const governanceERC20Symbol = 'GOV';

const addressZero = ethers.constants.AddressZero;

let from: SignerWithAddress;
let to: SignerWithAddress;
let other: SignerWithAddress;
let toDelegate: string;

describe('GovernanceERC20', function () {
  let signers: SignerWithAddress[];
  let dao: DAO;
  let token: GovernanceERC20;
  let GovernanceERC20: GovernanceERC20__factory;
  let mintSettings: MintSettings;
  let defaultInitData: [string, string, string, MintSettings];

  before(async () => {
    signers = await ethers.getSigners();
    dao = await deployNewDAO(signers[0].address);
    GovernanceERC20 = await ethers.getContractFactory('GovernanceERC20');

    from = signers[0];
    to = signers[1];
    other = signers[2];
  });

  beforeEach(async function () {
    mintSettings = {
      receivers: signers.slice(0, 3).map(s => s.address),
      amounts: [123, 456, 789],
    };
    defaultInitData = [
      dao.address,
      governanceERC20Name,
      governanceERC20Symbol,
      mintSettings,
    ];

    token = await GovernanceERC20.deploy(...defaultInitData);
  });

  describe('initialize:', async () => {
    it('reverts if trying to re-initialize', async () => {
      await expect(token.initialize(...defaultInitData)).to.be.revertedWith(
        OZ_ERRORS.ALREADY_INITIALIZED
      );
    });

    it('sets the token name and symbol', async () => {
      expect(await token.name()).to.eq(governanceERC20Name);
      expect(await token.symbol()).to.eq(governanceERC20Symbol);
    });

    it('sets the managing DAO ', async () => {
      token = await GovernanceERC20.deploy(...defaultInitData);
      expect(await token.dao()).to.eq(dao.address);
    });

    it('reverts if the `receivers` and `amounts` array lengths in the mint settings mismatch', async () => {
      const receivers = [signers[0].address];
      const amounts = [123, 456];
      await expect(
        GovernanceERC20.deploy(
          dao.address,
          governanceERC20Name,
          governanceERC20Symbol,
          {receivers: receivers, amounts: amounts}
        )
      )
        .to.be.revertedWithCustomError(token, 'MintSettingsArrayLengthMismatch')
        .withArgs(receivers.length, amounts.length);
    });
  });

  describe('supportsInterface:', async () => {
    it('does not support the empty interface', async () => {
      expect(await token.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await token.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('it supports all inherited interfaces', async () => {
      await Promise.all(
        [
          'IERC20Upgradeable',
          'IERC20PermitUpgradeable',
          'IVotesUpgradeable',
          'IERC20MintableUpgradeable',
        ].map(async interfaceName => {
          const iface = new ethers.utils.Interface(
            // @ts-ignore
            (await hre.artifacts.readArtifact(interfaceName)).abi
          );
          expect(await token.supportsInterface(getInterfaceID(iface))).to.be
            .true;
        })
      );
      // We must check `IERC20MetadataUpgradeable` separately as it inherits from `IERC20Upgradeable` and we cannot get the isolated ABI.
      const ierc20MetadataInterface = new ethers.utils.Interface([
        'function name()',
        'function symbol()',
        'function decimals()',
      ]);
      expect(
        await token.supportsInterface(getInterfaceID(ierc20MetadataInterface))
      ).to.be.true;
    });
  });

  describe('mint:', async () => {
    it('reverts if the `MINT_PERMISSION_ID` permission is missing', async () => {
      await expect(token.mint(signers[0].address, 123))
        .to.be.revertedWithCustomError(token, 'DaoUnauthorized')
        .withArgs(
          dao.address,
          token.address,
          signers[0].address,
          MINT_PERMISSION_ID
        );
    });

    it('mints tokens if the caller has the `mintPermission`', async () => {
      await dao.grant(token.address, signers[0].address, MINT_PERMISSION_ID);

      const receiverAddr = signers[9].address;
      const oldBalance = await token.balanceOf(receiverAddr);

      const mintAmount = 100;
      await token.mint(receiverAddr, mintAmount);

      expect(await token.balanceOf(receiverAddr)).to.eq(
        oldBalance.add(mintAmount)
      );
    });
  });

  describe('delegate', async () => {
    it('delegates voting power to another account', async () => {
      const balanceSigner0 = await token.balanceOf(signers[0].address);
      const balanceSigner1 = await token.balanceOf(signers[1].address);

      // delegate the votes of signers[0] to signers[1]
      await token.connect(signers[0]).delegate(signers[1].address);

      // signers[0] delegates to signers[1]
      expect(await token.delegates(signers[0].address)).to.eq(
        signers[1].address
      );

      // signers[1] delegates to herself
      expect(await token.delegates(signers[1].address)).to.eq(
        signers[1].address
      );

      // balances remain the same
      expect(await token.balanceOf(signers[0].address)).to.eq(balanceSigner0);
      expect(await token.balanceOf(signers[1].address)).to.eq(balanceSigner1);

      // the voting power changes
      expect(await token.getVotes(signers[0].address)).to.eq(0);
      expect(await token.getVotes(signers[1].address)).to.eq(
        balanceSigner1.add(balanceSigner0)
      );
    });

    it('is checkpointed', async () => {
      const balanceSigner0 = await token.balanceOf(signers[0].address);
      const balanceSigner1 = await token.balanceOf(signers[1].address);
      const balanceSigner2 = await token.balanceOf(signers[2].address);

      let tx1 = await token.connect(signers[0]).delegate(signers[1].address);
      await ethers.provider.send('evm_mine', []);

      // verify that current votes are correct
      expect(await token.getVotes(signers[0].address)).to.eq(0);
      expect(await token.getVotes(signers[1].address)).to.eq(
        balanceSigner1.add(balanceSigner0)
      );
      expect(await token.getVotes(signers[2].address)).to.eq(balanceSigner2);

      let tx2 = await token.connect(signers[0]).delegate(signers[2].address);
      await ethers.provider.send('evm_mine', []);

      // verify that current votes are correct
      expect(await token.getVotes(signers[0].address)).to.eq(0);
      expect(await token.getVotes(signers[1].address)).to.eq(balanceSigner1);
      expect(await token.getVotes(signers[2].address)).to.eq(
        balanceSigner2.add(balanceSigner0)
      );

      // verify that past votes are correct
      expect(
        await token.getPastVotes(signers[0].address, tx1.blockNumber!)
      ).to.eq(0);
      expect(
        await token.getPastVotes(signers[1].address, tx1.blockNumber!)
      ).to.eq(balanceSigner1.add(balanceSigner0));
      expect(
        await token.getPastVotes(signers[2].address, tx1.blockNumber!)
      ).to.eq(balanceSigner2);
    });
  });

  describe('afterTokenTransfer', async () => {
    beforeEach(async () => {
      token = await GovernanceERC20.deploy(dao.address, 'name', 'symbol', {
        receivers: [],
        amounts: [],
      });

      await dao.grant(token.address, signers[0].address, MINT_PERMISSION_ID);
    });

    it('turns on delegation after mint', async () => {
      expect(await token.delegates(signers[0].address)).to.equal(addressZero);

      await expect(token.mint(signers[0].address, 1)).to.emit(
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
      await token.mint(signers[0].address, 100);

      // At this time, signers[1] doesn't have delegation turned on,
      // but the transfer should turn it on.
      expect(await token.delegates(signers[1].address)).to.equal(addressZero);

      // Should turn on delegation
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
      await token.mint(signers[0].address, 100);

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
      await token.mint(signers[0].address, 100);

      await token.transfer(signers[1].address, 50);

      // turn off delegation
      await token.connect(signers[1]).delegate(addressZero);

      // Shouldn't turn on delegation
      await expect(token.transfer(signers[1].address, 50)).to.not.emit(
        token,
        'DelegateChanged'
      );

      expect(await token.delegates(signers[1].address)).to.equal(addressZero);
      expect(await token.getVotes(signers[1].address)).to.equal(0);
    });

    it('should not turn on delegation on `mint` if `to` manually turned it off', async () => {
      await token.mint(signers[0].address, 100);

      // turn off delegation
      await token.delegate(addressZero);

      // Shouldn't turn on delegation
      await expect(token.mint(signers[0].address, 50)).to.not.emit(
        token,
        'DelegateChanged'
      );

      expect(await token.delegates(signers[0].address)).to.equal(addressZero);
      expect(await token.getVotes(signers[1].address)).to.equal(0);
    });

    it('should not rewrite delegation setting for `transfer` if user set it on before receiving tokens', async () => {
      await token.mint(signers[0].address, 10);

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

      await expect(token.mint(signers[1].address, 10)).to.not.emit(
        token,
        'DelegateChanged'
      );
    });

    it('should not turn on delegation on `mint` if it was turned on at least once in the past', async () => {
      await token.mint(signers[0].address, 100);

      await expect(token.mint(signers[0].address, 100)).to.not.emit(
        token,
        'DelegateChanged'
      );

      expect(await token.getVotes(signers[0].address)).to.equal(200);
    });

    it('should not turn on delegation on `transfer` if it was turned on at least once in the past', async () => {
      await token.mint(signers[0].address, 100);

      await token.transfer(signers[1].address, 50);

      await expect(token.transfer(signers[1].address, 30)).to.not.emit(
        token,
        'DelegateChanged'
      );

      expect(await token.getVotes(signers[1].address)).to.equal(80);
    });

    it('updates voting power after transfer for `from` if delegation turned on', async () => {
      await token.mint(signers[0].address, 100);

      await token.transfer(signers[1].address, 30);

      expect(await token.getVotes(signers[0].address)).to.equal(70);
    });

    it('updates voting power after transfer for `to` if delegation turned on', async () => {
      await token.mint(signers[0].address, 100);

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
              .withArgs(to.address, toDelegate, other.address);
            toDelegate = other.address;
          });

          context('`to` receives via `mint` from `address(0)`', async () => {
            beforeEach(async () => {
              await expect(token.mint(to.address, 100)).to.not.emit(
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
          });

          context('`to` receives via transfer from `from`', async () => {
            beforeEach(async () => {
              await token.mint(from.address, 100);
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
          context('`to` receives via `mint` from `address(0)`', async () => {
            beforeEach(async () => {
              await expect(token.mint(to.address, 100))
                .to.emit(token, 'DelegateChanged')
                .withArgs(to.address, toDelegate, to.address); // the mint triggers automatic self-delegation
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
          });

          context('`to` receives via transfer from `from`', async () => {
            beforeEach(async () => {
              await token.mint(from.address, 100);
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
          await expect(token.mint(to.address, 100))
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

          context('`to` receives via `mint` from `address(0)`', async () => {
            beforeEach(async () => {
              await expect(token.mint(to.address, 100)).to.not.emit(
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
                expect(await token.delegates(to.address)).to.equal(
                  other.address
                );
              });
              it('`to`s delegate has the correct voting power', async () => {
                expect(await token.getVotes(toDelegate)).to.equal(200);
              });
            });
          });

          context('`to` receives via transfer from `from`', async () => {
            beforeEach(async () => {
              await token.mint(from.address, 100);
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
          context('`to` receives via `mint` from `address(0)`', async () => {
            beforeEach(async () => {
              await expect(token.mint(to.address, 100)).to.not.emit(
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

          context('`to` receives via transfer from `from`', async () => {
            beforeEach(async () => {
              await token.mint(from.address, 100);
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
