import {expect} from 'chai';
import {ethers} from 'hardhat';

import {DAO, PluginRepo} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
};

describe('Aragon-Plugin-Registry', function () {
  let aragonPluginRegistry: any;
  let ownerAddress: string;
  let dao: DAO;
  let pluginRepo: PluginRepo;

  const REGISTER_ROLE = ethers.utils.id('REGISTER_ROLE');

  before(async () => {
    const signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // DAO
    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x00', ownerAddress, ethers.constants.AddressZero);

    // deploy and initialize AragonPluginRegistry
    const AragonPluginRegistry = await ethers.getContractFactory(
      'AragonPluginRegistry'
    );
    aragonPluginRegistry = await AragonPluginRegistry.deploy();
    await aragonPluginRegistry.initialize(dao.address);

    // deploy a pluginRepo and initialize
    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    pluginRepo = await PluginRepo.deploy();
    await pluginRepo.initialize(ownerAddress);

    // grant REGISTER_ROLE to registrer
    dao.grant(aragonPluginRegistry.address, ownerAddress, REGISTER_ROLE);
  });

  it('Should register a new pluginRepo successfully', async function () {
    const pluginRepoName = 'my-pluginRepo';

    await expect(
      await aragonPluginRegistry.register(pluginRepoName, pluginRepo.address)
    )
      .to.emit(aragonPluginRegistry, EVENTS.PluginRepoRegistered)
      .withArgs(pluginRepoName, pluginRepo.address);

    expect(await aragonPluginRegistry.entries(pluginRepo.address)).to.equal(
      true
    );
  });

  it('fail to register if the sender lacks the required role', async () => {
    const pluginRepoName = 'my-pluginRepo';

    dao.revoke(aragonPluginRegistry.address, ownerAddress, REGISTER_ROLE);

    await expect(
      aragonPluginRegistry.register(pluginRepoName, pluginRepo.address)
    ).to.be.revertedWith(
      customError(
        'ACLAuth',
        aragonPluginRegistry.address,
        aragonPluginRegistry.address,
        ownerAddress,
        REGISTER_ROLE
      )
    );
  });

  it('fail to register if pluginRepo already exists', async function () {
    const pluginRepoName = 'my-pluginRepo';

    await aragonPluginRegistry.register(pluginRepoName, pluginRepo.address);

    await expect(
      aragonPluginRegistry.register(pluginRepoName, pluginRepo.address)
    ).to.be.revertedWith(
      customError('ContractAlreadyRegistered', pluginRepo.address)
    );
  });
});
