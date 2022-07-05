import {expect} from 'chai';
import {ethers} from 'hardhat';
import {customError} from '../test-utils/custom-error-helper';

const EVENTS = {
  NewDAORegistered: 'NewDAORegistered',
};

describe('DAORegistry', function () {
  let registry: any;
  let managingDAO: any;
  let ownerAddress: string;

  const REGISTER_DAO_ROLE = ethers.utils.id('REGISTER_DAO_ROLE');

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

    // Grant the `REGISTER_DAO_ROLE` permission to `signers[0]`
    managingDAO.grant(registry.address, ownerAddress, REGISTER_DAO_ROLE);
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

  it('fail to register if the sender lacks the required role', async () => {
    const daoName = 'my-dao';

    managingDAO.revoke(registry.address, ownerAddress, REGISTER_DAO_ROLE);

    await expect(
      registry.register(daoName, managingDAO.address, ownerAddress)
    ).to.be.revertedWith(
      customError(
        'ACLAuth',
        registry.address,
        registry.address,
        ownerAddress,
        REGISTER_DAO_ROLE
      )
    );
  });

  it('fail to register if DAO already exists', async function () {
    const daoName = 'my-dao';

    await registry.register(daoName, managingDAO.address, ownerAddress);

    await expect(
      registry.register(daoName, managingDAO.address, ownerAddress)
    ).to.be.revertedWith(
      customError('ContractAlreadyRegistered', managingDAO.address)
    );
  });
});
