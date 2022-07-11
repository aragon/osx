import {expect} from 'chai';
import {ethers} from 'hardhat';

import {DAO, PluginRepo} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';
import {deployNewDAO} from '../test-utils/dao';
import {deployNewPluginRepo} from '../test-utils/repo';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
};

describe('Aragon-Plugin-Registry', function () {
  let aragonPluginRegistry: any;
  let ownerAddress: string;
  let managingDAO: DAO;
  let pluginRepo: PluginRepo;

  const REGISTER_PERMISSION_ID = ethers.utils.id('REGISTER_PERMISSION_ID');
  const pluginRepoName = 'my-pluginRepo';

  before(async () => {
    const signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // DAO
    managingDAO = await deployNewDAO(ownerAddress);

    // deploy and initialize AragonPluginRegistry
    const AragonPluginRegistry = await ethers.getContractFactory(
      'AragonPluginRegistry'
    );
    aragonPluginRegistry = await AragonPluginRegistry.deploy();
    await aragonPluginRegistry.initialize(managingDAO.address);

    // deploy a pluginRepo and initialize
    pluginRepo = await deployNewPluginRepo(ownerAddress);

    // grant REGISTER_PERMISSION_ID to registrer
    managingDAO.grant(
      aragonPluginRegistry.address,
      ownerAddress,
      REGISTER_PERMISSION_ID
    );
  });

  it('Should register a new pluginRepo successfully', async function () {
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
    // Register a plugin successfully
    await aragonPluginRegistry.register(pluginRepoName, pluginRepo.address);

    // Revoke the permission
    await managingDAO.revoke(
      aragonPluginRegistry.address,
      ownerAddress,
      REGISTER_PERMISSION_ID
    );

    // deploy a pluginRepo
    const newPluginRepo = await deployNewPluginRepo(ownerAddress);

    await expect(
      aragonPluginRegistry.register(pluginRepoName, newPluginRepo.address)
    ).to.be.revertedWith(
      customError(
        'DAOPermissionMissing',
        managingDAO.address,
        aragonPluginRegistry.address,
        aragonPluginRegistry.address,
        ownerAddress,
        REGISTER_PERMISSION_ID
      )
    );
  });

  it('fail to register if pluginRepo already exists', async function () {
    await aragonPluginRegistry.register(pluginRepoName, pluginRepo.address);

    await expect(
      aragonPluginRegistry.register(pluginRepoName, pluginRepo.address)
    ).to.be.revertedWith(
      customError('ContractAlreadyRegistered', pluginRepo.address)
    );
  });
});
