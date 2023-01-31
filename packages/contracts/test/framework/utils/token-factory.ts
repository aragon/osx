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
} from '../../typechain';

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

describe.skip('Core: TokenFactory', () => {
  let tokenFactory: MockContract<TokenFactory>;
  let governanceBase: MockContract<GovernanceERC20>;
  let governanceWrappedBase: MockContract<GovernanceWrappedERC20>;
  let merkleMinterBase: MockContract<MerkleMinter>;

  beforeEach(async () => {
    const GovernanceBaseFactory = await smock.mock<GovernanceERC20__factory>(
      'GovernanceERC20'
    );
    governanceBase = await GovernanceBaseFactory.deploy(
      ethers.constants.AddressZero,
      'name',
      'symbol',
      {receivers: [], amounts: []}
    );

    const GovernanceWrappedBaseFactory =
      await smock.mock<GovernanceWrappedERC20__factory>(
        'GovernanceWrappedERC20'
      );
    governanceWrappedBase = await GovernanceWrappedBaseFactory.deploy(
      ethers.constants.AddressZero,
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
    tokenFactory.setVariable('governanceERC20Base', governanceBase.address);
    tokenFactory.setVariable(
      'governanceWrappedERC20Base',
      governanceWrappedBase.address
    );
    tokenFactory.setVariable('merkleMinterBase', merkleMinterBase.address);
  });

  describe('createToken', () => {
    let dao: FakeContract<DAO>;

    beforeEach(async () => {
      dao = await smock.fake<DAO>('DAO');
      dao.isGranted.returns(true);
      dao.hasPermission.returns(true);
    });

    it('should fail if token addr is no ERC20 contract', async () => {
      const dummyContractFactory = await ethers.getContractFactory(
        'DummyContract'
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
        tokenFactory.callStatic.createToken(dao.address, config, mintConfig)
      ).to.revertedWith('Address: low-level call failed');
    });

    it('should create a GovernanceWrappedERC20 clone', async () => {
      const erc20Contract = await smock.fake<GovernanceERC20>(
        'GovernanceERC20'
      );
      const config: TokenConfig = {
        addr: erc20Contract.address,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      const [wrappedToken, merkleMinter] =
        await tokenFactory.callStatic.createToken(
          dao.address,
          config,
          mintConfig
        );

      expect(wrappedToken).not.to.be.eq(governanceWrappedBase.address);
    });

    it('should return MerkleMinter with 0x0', async () => {
      const erc20Contract = await smock.fake<GovernanceERC20>(
        'GovernanceERC20'
      );
      const config: TokenConfig = {
        addr: erc20Contract.address,
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintConfig: MintConfig = {
        receivers: ['0x0000000000000000000000000000000000000002'],
        amounts: [1],
      };

      let tx = await tokenFactory.callStatic.createToken(
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

      let tx = await tokenFactory.callStatic.createToken(
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

      let tx = await tokenFactory.callStatic.createToken(
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
        tokenFactory.createToken(dao.address, config, mintConfig)
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

      const tx = await tokenFactory.createToken(
        dao.address,
        config,
        mintConfig
      );
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

    it('should mint tokens to DAO treasury', async () => {
      const config: TokenConfig = {
        addr: '0x0000000000000000000000000000000000000000',
        name: 'FakeToken',
        symbol: 'FT',
      };

      const mintAddress = '0x0000000000000000000000000000000000000001';

      const mintConfig: MintConfig = {
        receivers: [mintAddress],
        amounts: [1],
      };

      const tx = await tokenFactory.createToken(
        dao.address,
        config,
        mintConfig
      );
      const rc = await tx.wait();
      const eventArgs =
        rc.events?.find(e => e.event === 'TokenCreated')?.args || [];

      const erc20Contract = await ethers.getContractAt(
        'ERC20Upgradeable',
        eventArgs[0]
      );

      await expect(tx)
        .to.emit(erc20Contract, 'Transfer')
        .withArgs(
          '0x0000000000000000000000000000000000000000',
          mintConfig.receivers[0],
          mintConfig.amounts[0]
        );
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
