import {expect} from 'chai';
import {ethers} from 'hardhat';

import {customError} from '../test-utils/custom-error-helper';
import {deployNewDAO} from '../test-utils/dao';

const EVENTS = {
  DAORegistered: 'DAORegistered',
};

describe('DAORegistry', function () {
  let registry: any;
  let managingDAO: any;
  let ownerAddress: string;
  let targetDao: any;

  const REGISTER_DAO_PERMISSION_ID = ethers.utils.id(
    'REGISTER_DAO_PERMISSION_ID'
  );
  const daoSubdomainName = 'my-dao';

  before(async () => {
    const signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // Managing DAO
    managingDAO = await deployNewDAO(ownerAddress);

    // Target DAO to be used as an example DAO to be registered
    targetDao = await deployNewDAO(ownerAddress);

    // DAO Registry
    const Registry = await ethers.getContractFactory('DAORegistry');
    registry = await Registry.deploy();
    await registry.initialize(managingDAO.address);

    // Grant the `REGISTER_DAO_ROLE` permission to `signers[0]`
    await managingDAO.grant(
      registry.address,
      ownerAddress,
      REGISTER_DAO_PERMISSION_ID
    );
  });

  it('Should register a new DAO successfully', async function () {
    await expect(
      await registry.register(daoSubdomainName, targetDao.address, ownerAddress)
    )
      .to.emit(registry, EVENTS.DAORegistered)
      .withArgs(targetDao.address, ownerAddress, daoSubdomainName);

    expect(await registry.entries(targetDao.address)).to.equal(true);
  });

  it('fail to register if the sender lacks the required role', async () => {
    // Register a DAO successfully
    await registry.register(daoSubdomainName, targetDao.address, ownerAddress);

    // Revoke the permission
    await managingDAO.revoke(
      registry.address,
      ownerAddress,
      REGISTER_DAO_PERMISSION_ID
    );

    const newTargetDao = await deployNewDAO(ownerAddress);

    await expect(
      registry.register(daoSubdomainName, newTargetDao.address, ownerAddress)
    ).to.be.revertedWith(
      customError(
        'DAOPermissionMissing',
        managingDAO.address,
        registry.address,
        registry.address,
        ownerAddress,
        REGISTER_DAO_PERMISSION_ID
      )
    );
  });

  it('fail to register if DAO already exists', async function () {
    await registry.register(daoSubdomainName, targetDao.address, ownerAddress);

    await expect(
      registry.register(daoSubdomainName, targetDao.address, ownerAddress)
    ).to.be.revertedWith(
      customError('ContractAlreadyRegistered', targetDao.address)
    );
  });

  it('register more than one DAO with the same name', async function () {
    // TODO: Current behaviour of the DAO Registry allowes for DAO's name to be repeated,
    // but it should not, will be resolved once ENS subdomain is implemented and this test should be updated and renamed.

    await registry.register(daoSubdomainName, targetDao.address, ownerAddress);

    let newTargetDao = await deployNewDAO(ownerAddress);

    await expect(
      registry.register(daoSubdomainName, newTargetDao.address, ownerAddress)
    ).not.to.be.reverted;
  });
});
