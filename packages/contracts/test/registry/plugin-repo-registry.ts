import {expect} from 'chai';
import {ethers} from 'hardhat';

import {DAO, PluginRepo, ENSSubdomainRegistrar} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';
import {deployNewDAO} from '../test-utils/dao';
import {deployNewPluginRepo} from '../test-utils/repo';
import {deployENSSubdomainRegistrar} from '../test-utils/ens';
import {ensDomainHash, ensLabelHash} from '../../utils/ensHelpers';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
};

describe('PluginRepoRegistry', function () {
  let signers:any;
  let ensSubdomainRegistrar: ENSSubdomainRegistrar;
  let pluginRepoRegistry: any;
  let ownerAddress: string;
  let managingDAO: DAO;
  let pluginRepo: PluginRepo;

  const PLUGIN_REGISTER_PERMISSION_ID = ethers.utils.id(
    'PLUGIN_REGISTER_PERMISSION'
  );

  const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
    'REGISTER_ENS_SUBDOMAIN_PERMISSION'
  );

  const topLevelDomain = 'dao.eth';
  const pluginRepoName = 'my-plugin-repo';

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // DAO
    managingDAO = await deployNewDAO(ownerAddress);

    // ENS subdomain Registry
    ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDAO,
      topLevelDomain
    );

    // deploy and initialize PluginRepoRegistry
    const PluginRepoRegistry = await ethers.getContractFactory(
      'PluginRepoRegistry'
    );
    pluginRepoRegistry = await PluginRepoRegistry.deploy();
    await pluginRepoRegistry.initialize(managingDAO.address, ensSubdomainRegistrar.address);

    // deploy a pluginRepo and initialize
    pluginRepo = await deployNewPluginRepo(ownerAddress);

    // grant REGISTER_PERMISSION_ID to registrer
    managingDAO.grant(
      pluginRepoRegistry.address,
      ownerAddress,
      PLUGIN_REGISTER_PERMISSION_ID
    );

    // grant REGISTER_PERMISSION_ID to registrer
    managingDAO.grant(
      ensSubdomainRegistrar.address,
      pluginRepoRegistry.address,
      REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    );
  });

  it('Should register a new pluginRepo successfully', async function () {
    await expect(
      await pluginRepoRegistry.registerPluginRepo(
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
    await pluginRepoRegistry.registerPluginRepo(pluginRepoName, pluginRepo.address);

    // Revoke the permission
    await managingDAO.revoke(
      pluginRepoRegistry.address,
      ownerAddress,
      PLUGIN_REGISTER_PERMISSION_ID
    );

    // deploy a pluginRepo
    const newPluginRepo = await deployNewPluginRepo(ownerAddress);

    await expect(
      pluginRepoRegistry.registerPluginRepo(pluginRepoName, newPluginRepo.address)
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

  it('fail to register if pluginRepo already exists in the interface entries', async function () {
    await pluginRepoRegistry.registerPluginRepo('repo-1', pluginRepo.address);

    await expect(
      pluginRepoRegistry.registerPluginRepo('repo-2', pluginRepo.address)
    ).to.be.revertedWith(
      customError('ContractAlreadyRegistered', pluginRepo.address)
    );
  });

  it('fail to register if pluginRepo already exists in ens', async function () {
    await pluginRepoRegistry.registerPluginRepo(pluginRepoName, pluginRepo.address);

    const pluginRepoNameDomainHash = ensDomainHash(pluginRepoName + '.' + topLevelDomain);

    await expect(
      pluginRepoRegistry.registerPluginRepo(pluginRepoName, pluginRepo.address)
    ).to.be.revertedWith(
      customError('AlreadyRegistered', pluginRepoNameDomainHash, ensSubdomainRegistrar.address)
    );
  });
});
