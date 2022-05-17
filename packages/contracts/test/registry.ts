import { expect } from 'chai';
import { ethers } from 'hardhat';
import { customError } from './test-utils/custom-error-helper';

import { DAO, Registry } from '../typechain';

const REGISTER_DAO_ROLE = ethers.utils.id('REGISTER_DAO_ROLE')

describe('Registry', function () {
  let registry: Registry;
  let dao: DAO;
  let ownerAddress: string;

  beforeEach(async function () {
    const signers = await ethers.getSigners()
    ownerAddress = await signers[0].getAddress();

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);

    const Registry = await ethers.getContractFactory('Registry');
    registry = await Registry.deploy();
    await registry.initialize(dao.address);

    await dao.grant(registry.address, ownerAddress, REGISTER_DAO_ROLE);

  });

  describe('register: ', async () => {
    const dummyName = "abc";

    it('registers a new DAO and emit the associated event', async () => {

      expect(
        await registry.register(dao.address, ownerAddress, dummyName)
      )
        .to.emit(registry, 'NewDAORegistered')
        .withArgs(dao.address, ownerAddress, dummyName);
    });

    it('reverts if the DAO is already registered', async () => {
      await registry.register(dao.address, ownerAddress, dummyName);

      await expect(
        registry.register(dao.address, ownerAddress, dummyName)
      ).to.be.revertedWith(customError('DAOAlreadyRegistered', dao.address));
    });

    it('reverts if the sender lacks the required role', async () => {
      await dao.revoke(registry.address, ownerAddress, REGISTER_DAO_ROLE);

      await expect(
        registry.register(dao.address, ownerAddress, dummyName)
      ).to.be.revertedWith(customError('ACLAuth', registry.address, registry.address, ownerAddress, REGISTER_DAO_ROLE));
    });
  });
});
