import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import chaiUtils from '../../test-utils';
import {customError, ERRORS} from '../../test-utils/custom-error-helper';

chai.use(chaiUtils);

import {DAO, InterfaceBaseRegistryMock} from '../../../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

const EVENTS = {
  Registered: 'Registered',
};

describe('InterfaceBaseRegistry', function () {
  let signers: SignerWithAddress[];
  let interfaceBaseRegistryMock: InterfaceBaseRegistryMock;
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
    const InterfaceBaseRegistryMock = await ethers.getContractFactory(
      'InterfaceBaseRegistryMock'
    );
    interfaceBaseRegistryMock = await InterfaceBaseRegistryMock.deploy();

    await interfaceBaseRegistryMock.initialize(dao.address);

    // grant REGISTER_ROLE to registrer
    dao.grant(
      interfaceBaseRegistryMock.address,
      ownerAddress,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
    );
  });

  describe('Register', async () => {
    it('fail if registrant address is not a contract', async function () {
      const randomAddress = await signers[8].getAddress();

      await expect(
        interfaceBaseRegistryMock.register(randomAddress)
      ).to.be.revertedWith(
        customError('ContractAddressInvalid', randomAddress)
      );
    });

    it('fail to register if interfaceId is not supported', async () => {
      const AdaptiveERC165 = await ethers.getContractFactory('AdaptiveERC165');
      let adaptiveERC165 = await AdaptiveERC165.deploy();

      await expect(
        interfaceBaseRegistryMock.register(adaptiveERC165.address)
      ).to.be.revertedWith('ContractInterfaceInvalid');
    });

    it('fail register if REGISTER_ROLE is not granted', async () => {
      dao.revoke(
        interfaceBaseRegistryMock.address,
        ownerAddress,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
      );

      await expect(
        interfaceBaseRegistryMock.register(dao.address)
      ).to.be.revertedWith(
        customError(
          'ACLAuth',
          interfaceBaseRegistryMock.address,
          interfaceBaseRegistryMock.address,
          ownerAddress,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
        )
      );
    });

    it('register known interface', async () => {
      await expect(await interfaceBaseRegistryMock.register(dao.address))
        .to.emit(interfaceBaseRegistryMock, EVENTS.Registered)
        .withArgs(dao.address);

      expect(await interfaceBaseRegistryMock.entries(dao.address)).to.equal(
        true
      );
    });
  });
});
