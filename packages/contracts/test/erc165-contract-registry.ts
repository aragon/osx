import {expect} from 'chai';
import {ethers} from 'hardhat';
import {customError} from './test-utils/custom-error-helper';

import {DAO, ERC165ContractRegistry} from '../typechain';

const REGISTER_ROLE = ethers.utils.id('REGISTER_ROLE');

describe('ERC165ContractRegistry', function () {
  let registry: ERC165ContractRegistry;
  let managingDao: DAO;
  let ownerAddress: string;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    // create a managing DAO
    const DAO = await ethers.getContractFactory('DAO');
    managingDao = await DAO.deploy();
    await managingDao.initialize(
      '0x',
      ownerAddress,
      ethers.constants.AddressZero
    );

    // create an registry of `IDAO` contracts
    const ERC165ContractRegistry = await ethers.getContractFactory(
      'ERC165ContractRegistry'
    );
    registry = await ERC165ContractRegistry.deploy();
    await registry.initialize(managingDao.address, '0x47c61d85'); // '0x47c61d85' = type(IDAO).interfaceId;

    // grant permission to register to the caller
    await managingDao.grant(registry.address, ownerAddress, REGISTER_ROLE);
  });

  describe('register:', async () => {
    it('registers a contract of the right type', async () => {
      // `managingDao` is not registered yet
      expect(await registry.registrees(managingDao.address)).to.equal(false);

      // register `managingDao`
      await registry.register(managingDao.address);

      // `managingDao` is now registered
      expect(await registry.registrees(managingDao.address)).to.equal(true);
    });

    it('reverts if the contract is already registered', async () => {
      // `managingDao` is now registered
      await registry.register(managingDao.address);

      // try to register the `managingDao` again
      await expect(registry.register(managingDao.address)).to.be.revertedWith(
        customError('ContractAlreadyRegistered', managingDao.address)
      );
    });

    it('reverts if the contract does not support the interface', async () => {
      // try to register a contract of type `ERC165ContractRegistry` in a registry of `IDAO` contracts
      await expect(registry.register(registry.address)).to.be.revertedWith(
        customError('ContractInterfaceInvalid', registry.address)
      );
    });

    it('reverts if the sender lacks the required role', async () => {
      // revoke the permission to register from the caller
      await managingDao.revoke(registry.address, ownerAddress, REGISTER_ROLE);

      // try to register the `managingDao`
      await expect(registry.register(managingDao.address)).to.be.revertedWith(
        customError(
          'ACLAuth',
          registry.address,
          registry.address,
          ownerAddress,
          REGISTER_ROLE
        )
      );
    });
  });
});
