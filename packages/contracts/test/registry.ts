import {expect} from 'chai';
import {ethers} from 'hardhat';
import {customError} from './test-utils/custom-error-helper';

const EVENTS = {
  NewDAORegistered: 'NewDAORegistered'
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

    await expect(
      await registry.register(daoName, daoAddress, ownerAddress, ownerAddress)
    ).to.emit(registry, EVENTS.NewDAORegistered)
      .withArgs(daoAddress, ownerAddress, ownerAddress, daoName)
    
    expect(await registry.daos(daoName)).to.equal(true);
  });

  it('Should revert if name already exists', async function () {
    const wallet = ethers.Wallet.createRandom();
    const daoName = 'my-dao';
    const daoAddress = wallet.address;

    registry.register(daoName, daoAddress, ownerAddress, ownerAddress)

    await expect(
      registry.register(daoName, daoAddress, ownerAddress, ownerAddress)
    ).to.be.revertedWith(customError('RegistryNameAlreadyUsed', daoName))
  });

});
