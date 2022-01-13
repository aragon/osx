import {expect} from 'chai';
import {ethers} from 'hardhat';

const EVENTS = {
  NewDAORegistered: 'NewDAORegistered'
}

const ERRORS = {
  NameAlreadyInUse: 'name already in use'
}

describe('Registry', function () {
  let registry: any;
  let ownerAddress: string;

  before(async () => {
    const signers = await ethers.getSigners()
    ownerAddress = await signers[0].getAddress();
  })

  beforeEach(async function () {
    const Registry = await ethers.getContractFactory('Registry');
    registry = await Registry.deploy();
  });

  it('Should register a new name successfully', async function () {
    const wallet = ethers.Wallet.createRandom();
    const daoName = 'my-dao';
    const daoAddress = wallet.address;

    await expect(await registry.register(daoName, daoAddress, ownerAddress))
          .to.emit(registry, EVENTS.NewDAORegistered)
          .withArgs(daoAddress, ownerAddress, daoName)
    
    expect(await registry.daos(daoName)).to.equal(true);
  });

  it('Should revert if name already exists', async function () {
    const wallet = ethers.Wallet.createRandom();
    const daoName = 'my-dao';
    const daoAddress = wallet.address;

    registry.register(daoName, daoAddress, ownerAddress)

    await expect(registry.register(daoName, daoAddress, ownerAddress))
          .to.be.revertedWith(ERRORS.NameAlreadyInUse)
  });

});
