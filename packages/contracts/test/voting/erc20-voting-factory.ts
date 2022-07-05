import {expect} from 'chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {MintConfig, TokenConfig} from '../test-utils/token';
import {dummyVoteSettings} from '../test-utils/voting';
import {DAOMock} from '../../typechain';

describe('ERC20VotingFactory', function () {
  let signers: SignerWithAddress[];
  let ownerAddress: string;
  let erc20VotingFactory: any;
  let daoMock: DAOMock;
  let tokenFactory: any;

  const ADDRESS_ZERO = ethers.constants.AddressZero;

  function pluginDeployParams() {
    const tokenConfig: TokenConfig = {
      addr: ADDRESS_ZERO,
      name: 'FakeToken',
      symbol: 'FT',
    };
    const mintConfig: MintConfig = {
      receivers: [ownerAddress],
      amounts: [1],
    };

    return ethers.utils.defaultAbiCoder.encode(
      [
        'tuple(uint256,uint256,uint256)',
        'tuple(address,string,string)',
        'tuple(address[],uint256[])',
      ],
      [
        Object.values(dummyVoteSettings),
        Object.values(tokenConfig),
        Object.values(mintConfig),
      ]
    );
  }

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAOMock = await ethers.getContractFactory('DAOMock');
    daoMock = await DAOMock.deploy(ownerAddress);
  });

  beforeEach(async () => {
    // Token Facotry
    const TokenFactory = await ethers.getContractFactory('TokenFactory');
    tokenFactory = await TokenFactory.deploy();

    // ERC20VotingFactory
    const ERC20VotingFactory = await ethers.getContractFactory(
      'ERC20VotingFactory'
    );
    erc20VotingFactory = await ERC20VotingFactory.deploy(tokenFactory.address);

    // grant ROOT_ROLE to tokenFactory
    // @dev We assume that the TokenFactory has been granted DAO's ROOT_ROLE, so that this ERC20VotingFactory can create a token for the DAO's plugin.
    daoMock.grant(
      daoMock.address,
      tokenFactory.address,
      ethers.utils.id('ROOT_ROLE')
    );
  });

  it('Should have created new plugin base contract', async () => {
    const pluginBaseAddress = await erc20VotingFactory.getBasePluginAddress();

    expect(pluginBaseAddress).not.to.be.eq(ADDRESS_ZERO);
  });

  it('Should create token successfully', async () => {
    const tx = erc20VotingFactory.deploy(daoMock.address, pluginDeployParams());

    await expect(await tx).to.emit(tokenFactory, 'TokenCreated');
  });

  it('Deploy ERC20Voting contract successfully', async () => {
    const result = await erc20VotingFactory.callStatic.deploy(
      daoMock.address,
      pluginDeployParams()
    );

    await expect(result).not.to.be.eq(ADDRESS_ZERO);
  });
});
