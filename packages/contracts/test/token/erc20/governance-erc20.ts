import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAO,
  GovernanceERC20,
  GovernanceERC20__factory,
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
  });

  describe('initialize:', async () => {
    it('reverts if trying to re-initialize', async () => {
      token = await GovernanceERC20.deploy(...defaultInitData);

      await expect(token.initialize(...defaultInitData)).to.be.revertedWith(
        OZ_ERRORS.ALREADY_INITIALIZED
      );
    });

    it('sets the token name and symbol', async () => {
      token = await GovernanceERC20.deploy(...defaultInitData);

      expect(await token.name()).to.eq(governanceERC20Name);
      expect(await token.symbol()).to.eq(governanceERC20Symbol);
    });

    it('sets the managing DAO ', async () => {
      token = await GovernanceERC20.deploy(...defaultInitData);
      expect(await token.getDAO()).to.eq(dao.address);
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
    it('it supports all inherited interfaces', async () => {
      token = await GovernanceERC20.deploy(...defaultInitData);

      await Promise.all(
        [
          'IERC165Upgradeable',
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
    beforeEach(async function () {
      token = await GovernanceERC20.deploy(...defaultInitData);
    });

    it('reverts if the `MINT_PERMISSION_ID` permission is missing', async () => {
      await expect(token.mint(signers[0].address, 123))
        .to.be.revertedWithCustomError(token, 'DaoUnauthorized')
        .withArgs(
          dao.address,
          token.address,
          token.address,
          signers[0].address,
          MINT_PERMISSION_ID
        );
    });

    it('mints tokens if the caller has the `mintPermission`', async () => {
      dao.grant(token.address, signers[0].address, MINT_PERMISSION_ID);

      const receiverAddr = signers[9].address;
      const oldBalance = await token.balanceOf(receiverAddr);

      const mintAmount = 100;
      await expect(token.mint(receiverAddr, mintAmount)).not.to.be.reverted;

      expect(await token.balanceOf(receiverAddr)).to.eq(
        oldBalance.add(mintAmount)
      );
    });
  });

  describe('delegate', async () => {
    beforeEach(async function () {
      token = await GovernanceERC20.deploy(...defaultInitData);
    });

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
        await token.getPastVotes(signers[0].address, tx1.blockNumber)
      ).to.eq(0);
      expect(
        await token.getPastVotes(signers[1].address, tx1.blockNumber)
      ).to.eq(balanceSigner1.add(balanceSigner0));
      expect(
        await token.getPastVotes(signers[2].address, tx1.blockNumber)
      ).to.eq(balanceSigner2);
    });
  });
});
