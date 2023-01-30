import {expect} from 'chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';

import {
  deployMockPluginSetup,
  deployPluginRepoRegistry,
} from '../test-utils/repo';
import {deployENSSubdomainRegistrar} from '../test-utils/ens';
import {deployNewDAO} from '../test-utils/dao';

import {PluginRepoRegistry, DAO} from '../../typechain';
import {getMergedABI} from '../../utils/abi';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
};

const REGISTER_PLUGIN_REPO_PERMISSION_ID = ethers.utils.id(
  'REGISTER_PLUGIN_REPO_PERMISSION'
);

const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
  'REGISTER_ENS_SUBDOMAIN_PERMISSION'
);

async function getPluginRepoRegistryEvents(tx: any) {
  const data = await tx.wait();
  const {events} = data;
  const {subdomain, pluginRepo} = events.find(
    ({event}: {event: any}) => event === EVENTS.PluginRepoRegistered
  ).args;

  return {
    subdomain,
    pluginRepo,
  };
}

describe('PluginRepoFactory: ', function () {
  let signers: SignerWithAddress[];
  let pluginRepoRegistry: PluginRepoRegistry;
  let ownerAddress: string;
  let managingDao: DAO;
  let pluginRepoFactory: any;

  let mergedABI: any;
  let pluginRepoFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const {abi, bytecode} = await getMergedABI(
      // @ts-ignore
      hre,
      'PluginRepoFactory',
      ['PluginRepoRegistry']
    );

    mergedABI = abi;
    pluginRepoFactoryBytecode = bytecode;
  });

  beforeEach(async function () {
    // DAO
    managingDao = await deployNewDAO(ownerAddress);

    // ENS subdomain Registry
    const ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDao,
      'dao.eth'
    );

    // deploy and initialize PluginRepoRegistry
    pluginRepoRegistry = await deployPluginRepoRegistry(
      managingDao,
      ensSubdomainRegistrar
    );

    // deploy PluginRepoFactory
    const PluginRepoFactory = new ethers.ContractFactory(
      mergedABI,
      pluginRepoFactoryBytecode,
      signers[0]
    );
    pluginRepoFactory = await PluginRepoFactory.deploy(
      pluginRepoRegistry.address
    );

    // grant REGISTER_PERMISSION_ID to pluginRepoFactory
    await managingDao.grant(
      pluginRepoRegistry.address,
      pluginRepoFactory.address,
      REGISTER_PLUGIN_REPO_PERMISSION_ID
    );

    // grant REGISTER_PERMISSION_ID to pluginRepoFactory
    await managingDao.grant(
      ensSubdomainRegistrar.address,
      pluginRepoRegistry.address,
      REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    );
  });

  it('fail to create new pluginRepo with no PLUGIN_REGISTER_PERMISSION', async () => {
    await managingDao.revoke(
      pluginRepoRegistry.address,
      pluginRepoFactory.address,
      REGISTER_PLUGIN_REPO_PERMISSION_ID
    );

    const pluginRepoSubdomain = 'my-pluginRepo';

    await expect(
      pluginRepoFactory.createPluginRepo(pluginRepoSubdomain, ownerAddress)
    )
      .to.be.revertedWithCustomError(pluginRepoRegistry, 'DaoUnauthorized')
      .withArgs(
        managingDao.address,
        pluginRepoRegistry.address,
        pluginRepoRegistry.address,
        pluginRepoFactory.address,
        REGISTER_PLUGIN_REPO_PERMISSION_ID
      );
  });

  it('fail to create new pluginRepo with empty subdomain', async () => {
    const pluginRepoSubdomain = '';

    await expect(
      pluginRepoFactory.createPluginRepo(pluginRepoSubdomain, ownerAddress)
    ).to.be.revertedWithCustomError(pluginRepoFactory, 'EmptyPluginRepoSubdomain');
  });

  it('create new pluginRepo', async () => {
    const pluginRepoSubdomain = 'my-plugin-repo';

    let tx = await pluginRepoFactory.createPluginRepo(
      pluginRepoSubdomain,
      ownerAddress
    );

    const {subdomain, pluginRepo} = await getPluginRepoRegistryEvents(tx);

    expect(subdomain).to.equal(pluginRepoSubdomain);
    expect(pluginRepo).not.undefined;
  });

  it.skip('fail creating new pluginRepo with wrong major version', async () => {
    const pluginSetupMock = await deployMockPluginSetup();

    const pluginRepoSubdomain = 'my-plugin-repo';
    const pluginSetupAddress = pluginSetupMock.address;
    const contentURI = '0x00';

    // Get the contract to be deployed by calling `createPluginRepoWithVersion` with `callStatic`

    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    const pluginRepoToBeCreated = PluginRepo.attach(
      pluginRepoFactory.callStatic.createPluginRepoWithFirstVersion(
        pluginRepoSubdomain,
        pluginSetupAddress,
        contentURI,
        ownerAddress
      )
    );

    await expect(
      pluginRepoFactory.createPluginRepoWithFirstVersion(
        pluginRepoSubdomain,
        pluginSetupAddress,
        contentURI,
        ownerAddress
      )
    )
      .to.be.revertedWithCustomError(pluginRepoToBeCreated, 'BumpInvalid')
      .withArgs([0, 0, 0], [0, 0, 0]);
  });

  it('create new pluginRepo with version', async () => {
    const pluginSetupMock = await deployMockPluginSetup();

    const pluginRepoSubdomain = 'my-plugin-repo';
    const pluginSetupAddress = pluginSetupMock.address;
    const releaseMetadata = '0x00';
    const buildMetadata = '0x00';

    let tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
      pluginRepoSubdomain,
      pluginSetupAddress,
      ownerAddress,
      releaseMetadata,
      buildMetadata
    );

    const {subdomain, pluginRepo} = await getPluginRepoRegistryEvents(tx);

    expect(subdomain).to.equal(pluginRepoSubdomain);
    expect(pluginRepo).not.undefined;
  });
});
