import {expect} from 'chai';
import {ethers} from 'hardhat';

describe('Registry', function () {
  let registry: any;

  before(async function () {
    const Registry = await ethers.getContractFactory('Registry');
    registry = await Registry.deploy();
    await registry.deployed();
  });

  it('Should register a new name successfully', async function () {
    const wallet = ethers.Wallet.createRandom();
    const daoName = 'my-dao';
    const daoAddress = wallet.address;

    const tx = await registry.register(daoName, daoAddress);
    await tx.wait();
    expect(await registry.daos(daoName)).to.equal(daoAddress);
  });
});
