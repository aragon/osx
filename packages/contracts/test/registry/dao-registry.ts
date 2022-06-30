import {expect} from 'chai';
import {ethers} from 'hardhat';

const EVENTS = {
  NewDAORegistered: 'NewDAORegistered',
};

describe('DAORegistry', function () {
  let registry: any;
  let managingDAO: any;
  let ownerAddress: string;

  before(async () => {
    const signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // Managing DAO
    const ManagingDAO = await ethers.getContractFactory('DAO');
    managingDAO = await ManagingDAO.deploy();
    await managingDAO.initialize(
      '0x00',
      ownerAddress,
      ethers.constants.AddressZero
    );

    // DAO Registry
    const Registry = await ethers.getContractFactory('DAORegistry');
    registry = await Registry.deploy();
    await registry.initialize(managingDAO.address);

    // Grant REGISTER_ROLE to registrer
    managingDAO.grant(
      registry.address,
      ownerAddress,
      ethers.utils.id('REGISTER_ROLE')
    );
  });

  it('Should register a new DAO successfully', async function () {
    const daoName = 'my-dao';

    await expect(
      await registry.register(daoName, managingDAO.address, ownerAddress)
    )
      .to.emit(registry, EVENTS.NewDAORegistered)
      .withArgs(managingDAO.address, ownerAddress, daoName);

    expect(await registry.entries(managingDAO.address)).to.equal(true);
  });
});
