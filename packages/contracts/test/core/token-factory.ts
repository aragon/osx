import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import {
  DAO,
  ERC20Upgradeable__factory,
  GovernanceERC20,
  GovernanceERC20__factory,
  GovernanceWrappedERC20,
  GovernanceWrappedERC20__factory,
  MerkleMinter,
  MerkleMinter__factory,
  TokenFactory,
  TokenFactory__factory,
} from '../../typechain';
import {FakeContract, MockContract, smock} from '@defi-wonderland/smock';

chai.use(smock.matchers);

const TOKEN_MINTER_ROLE = ethers.utils.id('TOKEN_MINTER_ROLE');
const MERKLE_MINTER_ROLE = ethers.utils.id('MERKLE_MINTER_ROLE');

interface TokenConfig {
  addr: string;
  name: string;
  symbol: string;
}

interface MintConfig {
  receivers: string[];
  amounts: number[];
}

describe('Core: TokenFactory', () => {
  let tokenFactory: MockContract<TokenFactory>;
  let governanceBase: MockContract<GovernanceERC20>;
  let governanceWrappedBase: MockContract<GovernanceWrappedERC20>;
  let merkleMinterBase: MockContract<MerkleMinter>;

  beforeEach(async () => {
    const GovernanceBaseFactory = await smock.mock<GovernanceERC20__factory>(
      'GovernanceERC20'
    );
    governanceBase = await GovernanceBaseFactory.deploy();

    const GovernanceWrappedBaseFactory =
      await smock.mock<GovernanceWrappedERC20__factory>(
        'GovernanceWrappedERC20'
      );
    governanceWrappedBase = await GovernanceWrappedBaseFactory.deploy({});

    const MerkleMinterBaseFactory = await smock.mock<MerkleMinter__factory>(
      'MerkleMinter'
    );
    merkleMinterBase = await MerkleMinterBaseFactory.deploy();

    const TokenFactoryFactory = await smock.mock<TokenFactory__factory>(
      'TokenFactory'
    );
    tokenFactory = await TokenFactoryFactory.deploy();
    tokenFactory.setVariable('governanceERC20Base', governanceBase.address);
    tokenFactory.setVariable(
      'governanceWrappedERC20Base',
      governanceWrappedBase.address
    );
    tokenFactory.setVariable('merkleMinterBase', merkleMinterBase.address);
  });

  describe('newToken', () => {
    let dao: FakeContract<DAO>;

    beforeEach(async () => {
      dao = await smock.fake<DAO>('DAO');
      dao.willPerform.returns(true);
      dao.hasPermission.returns(true);
    });

    it('should fail if token addr is no ERC20 contract', async () => {
      const dummyContractFactory = await ethers.getContractFactory('DummyContract')
      const dummyContract = await dummyContractFactory.deploy()
      const config: TokenConfig = {
        addr: dummyContract.address,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      await expect(tokenFactory.callStatic.newToken(
        dao.address,
        config,
        mintConfig
      )).to.revertedWith('Address: low-level call failed');
    })

    it('should create a GovernanceWrappedERC20 clone', async () => {
      const erc20Contract = await smock.fake<GovernanceERC20>('GovernanceERC20');
      const config: TokenConfig = {
        addr: erc20Contract.address,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      const tx = await tokenFactory.callStatic.newToken(
        dao.address,
        config,
        mintConfig
      );

      expect(tx[0]).not.to.be.eq(governanceWrappedBase.address);
    });

    it('should return MerkleMinter with 0x0', async () => {
      const erc20Contract = await smock.fake<GovernanceERC20>('GovernanceERC20');
      const config: TokenConfig = {
        addr: erc20Contract.address,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      let tx = await tokenFactory.callStatic.newToken(
        dao.address,
        config,
        mintConfig
      );

      expect(tx[1]).to.be.eq('0x0000000000000000000000000000000000000000');
    });

    it('should create a GovernanceERC20 clone', async () => {
      const config: TokenConfig = {
        addr: '0x0000000000000000000000000000000000000000',
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      let tx = await tokenFactory.callStatic.newToken(
        dao.address,
        config,
        mintConfig
      );

      expect(tx[0]).not.to.be.eq(governanceBase.address);
    });

    it('should create a MerkleMinter clone', async () => {
      const config: TokenConfig = {
        addr: '0x0000000000000000000000000000000000000000',
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      let tx = await tokenFactory.callStatic.newToken(
        dao.address,
        config,
        mintConfig
      );

      expect(tx[1]).not.to.be.eq('0x0000000000000000000000000000000000000000');
      expect(tx[1]).not.to.be.eq(merkleMinterBase.address);
    });

    it('should emit TokenCreated', async () => {
      const config: TokenConfig = {
        addr: '0x0000000000000000000000000000000000000000',
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      await expect(
        tokenFactory.newToken(dao.address, config, mintConfig)
      ).to.emit(tokenFactory, 'TokenCreated');
    });

    it('should mint tokens', async () => {
      const config: TokenConfig = {
        addr: '0x0000000000000000000000000000000000000000',
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

      const tx = await tokenFactory.newToken(dao.address, config, mintConfig);
      const rc = await tx.wait();
      const eventArgs =
        rc.events?.find(e => e.event === 'TokenCreated')?.args || [];

      const erc20Contract = await ethers.getContractAt(
        'ERC20Upgradeable',
        eventArgs[0]
      );

      for (const i in mintConfig.receivers) {
        await expect(tx)
          .to.emit(erc20Contract, 'Transfer')
          .withArgs(
            '0x0000000000000000000000000000000000000000',
            mintConfig.receivers[i],
            mintConfig.amounts[i]
          );
      }
    });

    it('should grant proper permissions', async () => {
      const config: TokenConfig = {
        addr: '0x0000000000000000000000000000000000000000',
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      const tx = await tokenFactory.callStatic.newToken(
        dao.address,
        config,
        mintConfig
      );

      expect(dao.grant).to.have.been.calledWith(
        tx[0],
        tokenFactory.address,
        TOKEN_MINTER_ROLE
      );
      expect(dao.revoke).to.have.been.calledWith(
        tx[0],
        tokenFactory.address,
        TOKEN_MINTER_ROLE
      );
      expect(dao.grant).to.have.been.calledWith(
        tx[0],
        dao.address,
        TOKEN_MINTER_ROLE
      );
      expect(dao.grant).to.have.been.calledWith(
        tx[0],
        tx[1],
        TOKEN_MINTER_ROLE
      );
      expect(dao.grant).to.have.been.calledWith(
        tx[1],
        dao.address,
        MERKLE_MINTER_ROLE
      );
    });
  });
});
