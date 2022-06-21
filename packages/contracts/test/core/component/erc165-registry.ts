import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import chaiUtils from '../../test-utils';
import {customError, ERRORS} from '../../test-utils/custom-error-helper';

chai.use(chaiUtils);

import {DAO, ERC165RegistryMock} from '../../../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

const EVENTS = {
  Registered: 'Registered',
};

describe('ERC165Registry', function () {
  let signers: SignerWithAddress[];
  let erc165RegistryMock: ERC165RegistryMock;
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
    const ERC165RegistryMock = await ethers.getContractFactory(
      'ERC165RegistryMock'
    );
    erc165RegistryMock = await ERC165RegistryMock.deploy();

    await erc165RegistryMock.initialize(dao.address);

    // grant REGISTER_ROLE to registrer
    dao.grant(
      erc165RegistryMock.address,
      ownerAddress,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
    );
  });

  describe('Register', async () => {
    it('fail if registrant address is not a contract', async function () {
      const randomAddress = await signers[8].getAddress();

      await expect(
        erc165RegistryMock.register(randomAddress)
      ).to.be.revertedWith(
        customError('ContractAddressInvalid', randomAddress)
      );
    });

    it('fail to register if interfaceId is not supported', async () => {
      const AdaptiveERC165 = await ethers.getContractFactory('AdaptiveERC165');
      let adaptiveERC165 = await AdaptiveERC165.deploy();

      await expect(
        erc165RegistryMock.register(adaptiveERC165.address)
      ).to.be.revertedWith('ContractInterfaceInvalid');
    });

    it('fail register if REGISTER_ROLE is not granted', async () => {
      dao.revoke(
        erc165RegistryMock.address,
        ownerAddress,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
      );

      await expect(erc165RegistryMock.register(dao.address)).to.be.revertedWith(
        customError(
          'ACLAuth',
          erc165RegistryMock.address,
          erc165RegistryMock.address,
          ownerAddress,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
        )
      );
    });

    it('register known interface', async () => {
      await expect(await erc165RegistryMock.register(dao.address))
        .to.emit(erc165RegistryMock, EVENTS.Registered)
        .withArgs(dao.address);

      expect(await erc165RegistryMock.entries(dao.address)).to.equal(true);
    });
  });
});
