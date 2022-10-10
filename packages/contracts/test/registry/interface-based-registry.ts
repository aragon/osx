import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {DAO, InterfaceBasedRegistryMock} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';

const REGISTER_PERMISSION_ID = ethers.utils.id('REGISTER_PERMISSION');

const EVENTS = {
  Registered: 'Registered',
};

describe('InterfaceBasedRegistry', function () {
  let signers: SignerWithAddress[];
  let interfaceBasedRegistryMock: InterfaceBasedRegistryMock;
  let dao: DAO;
  let ownerAddress: string;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    // DAO
    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x00', ownerAddress, ethers.constants.AddressZero);
  });

  beforeEach(async () => {
    const InterfaceBasedRegistryMock = await ethers.getContractFactory(
      'InterfaceBasedRegistryMock'
    );
    interfaceBasedRegistryMock = await InterfaceBasedRegistryMock.deploy();

    // Let the interface registry register `DAO` contracts for testing purposes
    await interfaceBasedRegistryMock.initialize(dao.address);

    // grant REGISTER_PERMISSION_ID to registrer
    dao.grant(
      interfaceBasedRegistryMock.address,
      ownerAddress,
      REGISTER_PERMISSION_ID
    );
  });

  describe('Register', async () => {
    it('fail if registrant address is not a contract', async function () {
      const randomAddress = await signers[8].getAddress();

      await expect(
        interfaceBasedRegistryMock.register(randomAddress)
      ).to.be.revertedWith(
        customError('ContractAddressInvalid', randomAddress)
      );
    });

    it('fail to register if the interface is not supported', async () => {
      // Use the `PluginRepo` contract for testing purposes here, because the interface differs from the `DAO` interface
      const PluginRepo = await ethers.getContractFactory('PluginRepo');
      let contractNotBeingADao = await PluginRepo.deploy();

      await expect(
        interfaceBasedRegistryMock.register(contractNotBeingADao.address)
      ).to.be.revertedWith(
        customError('ContractInterfaceInvalid', contractNotBeingADao.address)
      );
    });

    it('fail to register if the contract does not support ERC165', async () => {
      // Use the `CallbackHandler` contract for testing purposes here, because the interface doesn't support ERC-165.
      const CallbackHandler = await ethers.getContractFactory(
        'CallbackHandler'
      );
      let contractThatDoesNotSupportERC165 = await CallbackHandler.deploy();

      await expect(
        interfaceBasedRegistryMock.register(
          contractThatDoesNotSupportERC165.address
        )
      ).to.be.revertedWith(
        customError(
          'ContractERC165SupportInvalid',
          contractThatDoesNotSupportERC165.address
        )
      );
    });

    it('fail to register if the sender lacks the required permissionId', async () => {
      dao.revoke(
        interfaceBasedRegistryMock.address,
        ownerAddress,
        REGISTER_PERMISSION_ID
      );

      await expect(
        interfaceBasedRegistryMock.register(dao.address)
      ).to.be.revertedWith(
        customError(
          'DaoUnauthorized',
          dao.address,
          interfaceBasedRegistryMock.address,
          interfaceBasedRegistryMock.address,
          ownerAddress,
          REGISTER_PERMISSION_ID
        )
      );
    });

    it('fail to register if the contract is already registered', async () => {
      // contract is now registered
      await interfaceBasedRegistryMock.register(dao.address);

      // try to register the same contract again
      await expect(
        interfaceBasedRegistryMock.register(dao.address)
      ).to.be.revertedWith(
        customError('ContractAlreadyRegistered', dao.address)
      );
    });

    it('register a contract with known interface', async () => {
      // make sure the address is not already registered
      expect(await interfaceBasedRegistryMock.entries(dao.address)).to.equal(
        false
      );

      await expect(await interfaceBasedRegistryMock.register(dao.address))
        .to.emit(interfaceBasedRegistryMock, EVENTS.Registered)
        .withArgs(dao.address);

      expect(await interfaceBasedRegistryMock.entries(dao.address)).to.equal(
        true
      );
    });
  });
});
