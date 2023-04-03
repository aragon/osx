import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import {FakeContract, MockContract, smock} from '@defi-wonderland/smock';

import {
  DAO,
  GovernanceERC20,
  GovernanceERC20__factory,
  GovernanceWrappedERC20,
  GovernanceWrappedERC20__factory,
  MerkleMinter,
  MerkleMinter__factory,
  TokenFactory,
  TokenFactory__factory,
} from '../../../typechain';
import {findEvent} from '../../../utils/event';
import {
  TokenCreatedEvent,
  WrappedTokenEvent,
} from '../../../typechain/TokenFactory';

chai.use(smock.matchers);

const MINT_PERMISSION_ID = ethers.utils.id('MINT_PERMISSION');
const MERKLE_MINT_PERMISSION_ID = ethers.utils.id('MERKLE_MINT_PERMISSION');

interface TokenConfig {
  addr: string;
  name: string;
  symbol: string;
}

interface MintConfig {
  receivers: string[];
  amounts: number[];
}

const zeroAddr = ethers.constants.AddressZero;

describe('Core: TokenFactory', () => {
  let tokenFactory: MockContract<TokenFactory>;
  let governanceBase: MockContract<GovernanceERC20>;
  let governanceWrappedBase: MockContract<GovernanceWrappedERC20>;
  let merkleMinterBase: MockContract<MerkleMinter>;

  beforeEach(async () => {
    const GovernanceBaseFactory = await smock.mock<GovernanceERC20__factory>(
      'GovernanceERC20'
    );
    governanceBase = await GovernanceBaseFactory.deploy(
      zeroAddr,
      'name',
      'symbol',
      {receivers: [], amounts: []}
    );

    const GovernanceWrappedBaseFactory =
      await smock.mock<GovernanceWrappedERC20__factory>(
        'GovernanceWrappedERC20'
      );
    governanceWrappedBase = await GovernanceWrappedBaseFactory.deploy(
      zeroAddr,
      'name',
      'symbol'
    );

    const MerkleMinterBaseFactory = await smock.mock<MerkleMinter__factory>(
      'MerkleMinter'
    );
    merkleMinterBase = await MerkleMinterBaseFactory.deploy();

    const TokenFactoryFactory = await smock.mock<TokenFactory__factory>(
      'TokenFactory'
    );
    tokenFactory = await TokenFactoryFactory.deploy();

    await tokenFactory.setVariables({
      governanceERC20Base: governanceBase.address,
      governanceWrappedERC20Base: governanceWrappedBase.address,
      merkleMinterBase: merkleMinterBase.address,
    });
  });

  describe('createToken', () => {
    let dao: FakeContract<DAO>;

    beforeEach(async () => {
      dao = await smock.fake<DAO>('DAO');
      dao.isGranted.returns(true);
      dao.hasPermission.returns(true);
      dao.grant.returns();
    });

    it('should fail if token addr is no ERC20 contract', async () => {
      // NOTE that any contract that don't contain `balanceOf` is enough to use.
      const dummyContractFactory = await ethers.getContractFactory(
        'ActionExecute'
      );
      const dummyContract = await dummyContractFactory.deploy();
      const config: TokenConfig = {
        addr: dummyContract.address,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      await expect(
        tokenFactory.createToken(dao.address, config, mintConfig)
      ).to.be.revertedWith('Address: low-level static call failed');
    });

    it('should fail if token addr contains balanceOf, but returns different type', async () => {
      const erc20Contract = await smock.fake<GovernanceERC20>(
        'GovernanceERC20'
      );

      erc20Contract.balanceOf.returns(true);

      const config: TokenConfig = {
        addr: erc20Contract.address,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      await expect(
        tokenFactory.createToken(dao.address, config, mintConfig)
      ).to.be.revertedWithCustomError(tokenFactory, 'TokenNotERC20');
    });

    it('should create a GovernanceWrappedERC20 clone', async () => {
      const erc20Contract = await smock.fake<GovernanceERC20>(
        'GovernanceERC20'
      );

      erc20Contract.balanceOf.returns(2);

      const config: TokenConfig = {
        addr: erc20Contract.address,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      const tx = await tokenFactory.createToken(
        dao.address,
        config,
        mintConfig
      );

      const event = await findEvent<WrappedTokenEvent>(tx, 'WrappedToken');
      const factory = await ethers.getContractFactory('GovernanceWrappedERC20');
      const wrappedToken = factory.attach(event.args.token);

      expect(await wrappedToken.underlying()).to.equal(erc20Contract.address);
    });

    it('should return MerkleMinter with 0x0', async () => {
      const erc20Contract = await smock.fake<GovernanceERC20>(
        'GovernanceERC20'
      );

      erc20Contract.balanceOf.returns(2);

      const config: TokenConfig = {
        addr: erc20Contract.address,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      let [wrappedToken, merkleMinter] =
        await tokenFactory.callStatic.createToken(
          dao.address,
          config,
          mintConfig
        );

      expect(merkleMinter).to.be.eq(zeroAddr);
    });

    it('should create a GovernanceERC20 and merkleminter clone', async () => {
      const config: TokenConfig = {
        addr: zeroAddr,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      let [token, minter] = await tokenFactory.callStatic.createToken(
        dao.address,
        config,
        mintConfig
      );

      expect(token).not.to.be.eq(governanceBase.address);
      expect(minter).not.to.be.eq(zeroAddr);
      expect(minter).not.to.be.eq(merkleMinterBase.address);
    });

    it('should emit TokenCreated', async () => {
      const config: TokenConfig = {
        addr: zeroAddr,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      await expect(
        tokenFactory.createToken(dao.address, config, mintConfig)
      ).to.emit(tokenFactory, 'TokenCreated');

      // Maybe withArgs
    });

    it('should mint tokens', async () => {
      const config: TokenConfig = {
        addr: zeroAddr,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: [
          '0x0000000000000000000000000000000000000002',
          '0x0000000000000000000000000000000000000003',
        ],
        amounts: [1, 5],
      };

      const tx = await tokenFactory.createToken(
        dao.address,
        config,
        mintConfig
      );

      const event = await findEvent<TokenCreatedEvent>(tx, 'TokenCreated');
      const erc20Contract = await ethers.getContractAt(
        'ERC20Upgradeable',
        event.args.token
      );

      for (const i in mintConfig.receivers) {
        await expect(tx)
          .to.emit(erc20Contract, 'Transfer')
          .withArgs(zeroAddr, mintConfig.receivers[i], mintConfig.amounts[i]);
      }
    });

    it('should grant proper permissions', async () => {
      const config: TokenConfig = {
        addr: zeroAddr,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      const [token, merkleMinter] = await tokenFactory.callStatic.createToken(
        dao.address,
        config,
        mintConfig
      );

      expect(dao.grant).to.have.been.calledWith(
        token,
        dao.address,
        MINT_PERMISSION_ID
      );
      expect(dao.grant).to.have.been.calledWith(
        token,
        merkleMinter,
        MINT_PERMISSION_ID
      );
      expect(dao.grant).to.have.been.calledWith(
        merkleMinter,
        dao.address,
        MERKLE_MINT_PERMISSION_ID
      );
    });
  });
});
