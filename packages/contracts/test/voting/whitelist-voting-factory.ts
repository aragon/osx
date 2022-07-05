import {expect} from 'chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {dummyVoteSettings} from '../test-utils/voting';
import {DAOMock} from '../../typechain';

describe('WhitelistVotingFactory', function () {
  let signers: SignerWithAddress[];
  let ownerAddress: string;
  let whitelistVotingFactory: any;
  let daoMock: DAOMock;

  const ADDRESS_ZERO = ethers.constants.AddressZero;

  function pluginDeployParams() {
    return ethers.utils.defaultAbiCoder.encode(
      ['tuple(uint256,uint256,uint256)', 'address[]'],
      [Object.values(dummyVoteSettings), [ownerAddress]]
    );
  }

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAOMock = await ethers.getContractFactory('DAOMock');
    daoMock = await DAOMock.deploy(ownerAddress);
  });

  beforeEach(async () => {
    // WhitelistVotingFactory
    const WhitelistVotingFactory = await ethers.getContractFactory(
      'WhitelistVotingFactory'
    );
    whitelistVotingFactory = await WhitelistVotingFactory.deploy();
  });

  it('Should have created new plugin base contract', async () => {
    const pluginBaseAddress =
      await whitelistVotingFactory.getBasePluginAddress();

    expect(pluginBaseAddress).not.to.be.eq(ADDRESS_ZERO);
  });

  it('Deploy Whitelist contract successfully', async () => {
    const result = await whitelistVotingFactory.callStatic.deploy(
      daoMock.address,
      pluginDeployParams()
    );

    await expect(result).not.to.be.eq(ADDRESS_ZERO);
  });
});
