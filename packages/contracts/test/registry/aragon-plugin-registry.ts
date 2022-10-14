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
  let pluginRepoRegistry: any;
  let ownerAddress: string;
  let managingDAO: DAO;
  let pluginRepo: PluginRepo;

  const PLUGIN_REGISTER_PERMISSION_ID = ethers.utils.id(
    'PLUGIN_REGISTER_PERMISSION'
  );
  const pluginRepoName = 'my-pluginRepo';

  before(async () => {
    const signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // DAO
    managingDAO = await deployNewDAO(ownerAddress);

    // deploy and initialize PluginRepoRegistry
    const PluginRepoRegistry = await ethers.getContractFactory(
      'PluginRepoRegistry'
    );
    pluginRepoRegistry = await PluginRepoRegistry.deploy();
    await pluginRepoRegistry.initialize(managingDAO.address);

    // deploy a pluginRepo and initialize
    pluginRepo = await deployNewPluginRepo(ownerAddress);

    // grant REGISTER_PERMISSION_ID to registrer
    managingDAO.grant(
      pluginRepoRegistry.address,
      ownerAddress,
      PLUGIN_REGISTER_PERMISSION_ID
    );
  });

  it('Should register a new pluginRepo successfully', async function () {
    await expect(
      await pluginRepoRegistry.registerPlugin(
        pluginRepoName,
        pluginRepo.address
      )
    )
      .to.emit(pluginRepoRegistry, EVENTS.PluginRepoRegistered)
      .withArgs(pluginRepoName, pluginRepo.address);

    expect(await pluginRepoRegistry.entries(pluginRepo.address)).to.equal(true);
  });

  it('fail to register if the sender lacks the required role', async () => {
    // Register a plugin successfully
    await pluginRepoRegistry.registerPlugin(pluginRepoName, pluginRepo.address);

    // Revoke the permission
    await managingDAO.revoke(
      pluginRepoRegistry.address,
      ownerAddress,
      PLUGIN_REGISTER_PERMISSION_ID
    );

    // deploy a pluginRepo
    const newPluginRepo = await deployNewPluginRepo(ownerAddress);

    await expect(
      pluginRepoRegistry.registerPlugin(pluginRepoName, newPluginRepo.address)
    ).to.be.revertedWith(
      customError(
        'DaoUnauthorized',
        managingDAO.address,
        pluginRepoRegistry.address,
        pluginRepoRegistry.address,
        ownerAddress,
        PLUGIN_REGISTER_PERMISSION_ID
      )
    );
  });

  it('fail to register if pluginRepo already exists', async function () {
    await pluginRepoRegistry.registerPlugin(pluginRepoName, pluginRepo.address);

    await expect(
      pluginRepoRegistry.registerPlugin(pluginRepoName, pluginRepo.address)
    ).to.be.revertedWith(
      customError('ContractAlreadyRegistered', pluginRepo.address)
    );
  });
});
