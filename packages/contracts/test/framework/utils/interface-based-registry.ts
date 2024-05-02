import {expect} from 'chai';
import hre, {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {deployWithProxy} from '../../test-utils/proxy';

import {
  DAO,
  IDAO__factory,
  InterfaceBasedRegistryMock,
  InterfaceBasedRegistryMock__factory,
  PluginRepo__factory,
} from '../../../typechain';
import {deployNewDAO} from '../../test-utils/dao';
import {getInterfaceID} from '../../test-utils/interfaces';
import {ARTIFACT_SOURCES} from '../../test-utils/wrapper/Wrapper';

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
    dao = await deployNewDAO(signers[0]);
  });

  beforeEach(async () => {
    // TODO:GIORGI test commented
    // const InterfaceBasedRegistryMock = new InterfaceBasedRegistryMock__factory(
    //   signers[0]
    // );

    // interfaceBasedRegistryMock = await deployWithProxy(
    //   InterfaceBasedRegistryMock
    // );

    interfaceBasedRegistryMock = await hre.wrapper.deploy(
      'InterfaceBasedRegistryMock',
      {withProxy: true}
    );

    // Let the interface registry register `DAO` contracts for testing purposes
    await interfaceBasedRegistryMock.initialize(
      dao.address,
      getInterfaceID(IDAO__factory.createInterface())
    );

    // grant REGISTER_PERMISSION_ID to registrer
    await dao.grant(
      interfaceBasedRegistryMock.address,
      ownerAddress,
      REGISTER_PERMISSION_ID
    );
  });

  describe('Register', async () => {
    it('fail if registrant address is not a contract', async function () {
      const randomAddress = await signers[8].getAddress();

      await expect(interfaceBasedRegistryMock.register(randomAddress))
        .to.be.revertedWithCustomError(
          interfaceBasedRegistryMock,
          'ContractInterfaceInvalid'
        )
        .withArgs(randomAddress);
    });

    it('fail to register if the interface is not supported', async () => {
      // Use the `PluginRepo` contract for testing purposes here, because the interface differs from the `DAO` interface
      // TODO:GIORGI test commented
      // const PluginRepo = new PluginRepo__factory(signers[0]);
      // let contractNotBeingADao = await PluginRepo.deploy();
      let contractNotBeingADao = await hre.wrapper.deploy(
        ARTIFACT_SOURCES.PLUGIN_REPO
      );

      await expect(
        interfaceBasedRegistryMock.register(contractNotBeingADao.address)
      )
        .to.be.revertedWithCustomError(
          interfaceBasedRegistryMock,
          'ContractInterfaceInvalid'
        )
        .withArgs(contractNotBeingADao.address);
    });

    it('fail to register if the sender lacks the required permissionId', async () => {
      await dao.revoke(
        interfaceBasedRegistryMock.address,
        ownerAddress,
        REGISTER_PERMISSION_ID
      );

      await expect(interfaceBasedRegistryMock.register(dao.address))
        .to.be.revertedWithCustomError(
          interfaceBasedRegistryMock,
          'DaoUnauthorized'
        )
        .withArgs(
          dao.address,
          interfaceBasedRegistryMock.address,
          ownerAddress,
          REGISTER_PERMISSION_ID
        );
    });

    it('fail to register if the contract is already registered', async () => {
      // contract is now registered
      await interfaceBasedRegistryMock.register(dao.address);

      // try to register the same contract again
      await expect(interfaceBasedRegistryMock.register(dao.address))
        .to.be.revertedWithCustomError(
          interfaceBasedRegistryMock,
          'ContractAlreadyRegistered'
        )
        .withArgs(dao.address);
    });

    it('register a contract with known interface', async () => {
      // make sure the address is not already registered
      expect(await interfaceBasedRegistryMock.entries(dao.address)).to.equal(
        false
      );

      await expect(interfaceBasedRegistryMock.register(dao.address))
        .to.emit(interfaceBasedRegistryMock, EVENTS.Registered)
        .withArgs(dao.address);

      expect(await interfaceBasedRegistryMock.entries(dao.address)).to.equal(
        true
      );
    });
  });
});
