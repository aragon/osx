import {expect} from 'chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {AragonPluginRegistry, DAO} from '../../typechain';

import {customError} from '../test-utils/custom-error-helper';
import {deployMockPluginManager} from '../test-utils/repo';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
};

const zeroAddress = ethers.constants.AddressZero;

async function getAragonPluginRegistryEvents(tx: any) {
  const data = await tx.wait();
  const {events} = data;
  const {name, pluginRepo} = events.find(
    ({event}: {event: any}) => event === EVENTS.PluginRepoRegistered
  ).args;

  return {
    name,
    pluginRepo,
  };
}

async function getMergedABI() {
  // @ts-ignore
  const AragonPluginRegistryArtifact = await hre.artifacts.readArtifact(
    'AragonPluginRegistry'
  );
  // @ts-ignore
  const PluginRepoFactoryArtifact = await hre.artifacts.readArtifact(
    'PluginRepoFactory'
  );

  return {
    abi: [
      ...PluginRepoFactoryArtifact.abi,
      ...AragonPluginRegistryArtifact.abi.filter(
        (f: any) => f.type === 'event'
      ),
    ],
    bytecode: PluginRepoFactoryArtifact.bytecode,
  };
}

describe('PluginRepoFactory: ', function () {
  let signers: SignerWithAddress[];
  let aragonPluginRegistry: AragonPluginRegistry;
  let ownerAddress: string;
  let managingDao: DAO;
  let pluginRepoFactory: any;

  let mergedABI: any;
  let pluginRepoFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const {abi, bytecode} = await getMergedABI();

    mergedABI = abi;
    pluginRepoFactoryBytecode = bytecode;
  });

  beforeEach(async function () {
    // DAO
    const DAO = await ethers.getContractFactory('DAO');
    managingDao = await DAO.deploy();
    await managingDao.initialize('0x00', ownerAddress, zeroAddress);

    // deploy and initialize AragonPluginRegistry
    const AragonPluginRegistry = await ethers.getContractFactory(
      'AragonPluginRegistry'
    );
    aragonPluginRegistry = await AragonPluginRegistry.deploy();
    await aragonPluginRegistry.initialize(managingDao.address);

    // deploy PluginRepoFactory
    const PluginRepoFactory = new ethers.ContractFactory(
      mergedABI,
      pluginRepoFactoryBytecode,
      signers[0]
    );
    pluginRepoFactory = await PluginRepoFactory.deploy(
      aragonPluginRegistry.address
    );

    // grant REGISTER_PERMISSION_ID to pluginRepoFactory
    managingDao.grant(
      aragonPluginRegistry.address,
      pluginRepoFactory.address,
      ethers.utils.id('REGISTER_PERMISSION')
    );
  });

  it('fail to create new pluginRepo with no REGISTER_PERMISSION', async () => {
    managingDao.revoke(
      aragonPluginRegistry.address,
      pluginRepoFactory.address,
      ethers.utils.id('REGISTER_PERMISSION')
    );

    const pluginRepoName = 'my-pluginRepo';

    await expect(
      pluginRepoFactory.createPluginRepo(pluginRepoName, ownerAddress)
    ).to.be.revertedWith(
      customError(
        'DaoUnauthorized',
        managingDao.address,
        aragonPluginRegistry.address,
        aragonPluginRegistry.address,
        pluginRepoFactory.address,
        ethers.utils.id('REGISTER_PERMISSION')
      )
    );
  });

  it('fail to create new pluginRepo with empty name', async () => {
    const pluginRepoName = '';

    await expect(
      pluginRepoFactory.createPluginRepo(pluginRepoName, ownerAddress)
    ).to.be.revertedWith(customError('EmptyPluginRepoName'));
  });

  it('create new pluginRepo', async () => {
    const pluginRepoName = 'my-pluginRepo';

    let tx = await pluginRepoFactory.createPluginRepo(
      pluginRepoName,
      ownerAddress
    );

    const {name, pluginRepo} = await getAragonPluginRegistryEvents(tx);

    expect(name).to.equal(pluginRepoName);
    expect(pluginRepo).not.undefined;
  });

  it('fail creating new pluginRepo with wrong major version', async () => {
    const pluginManagerMock = await deployMockPluginManager();

    const pluginRepoName = 'my-pluginRepo';
    const initialSemanticVersion = [0, 0, 0];
    const pluginManagerAddress = pluginManagerMock.address;
    const contentURI = '0x00';

    await expect(
      pluginRepoFactory.createPluginRepoWithVersion(
        pluginRepoName,
        initialSemanticVersion,
        pluginManagerAddress,
        contentURI,
        ownerAddress
      )
    ).to.be.revertedWith('InvalidBump([0, 0, 0], [0, 0, 0])');
  });

  it('create new pluginRepo with version', async () => {
    const pluginManagerMock = await deployMockPluginManager();

    const pluginRepoName = 'my-pluginRepo';
    const initialSemanticVersion = [1, 0, 0];
    const pluginManagerAddress = pluginManagerMock.address;
    const contentURI = '0x00';

    let tx = await pluginRepoFactory.createPluginRepoWithVersion(
      pluginRepoName,
      initialSemanticVersion,
      pluginManagerAddress,
      contentURI,
      ownerAddress
    );

    const {name, pluginRepo} = await getAragonPluginRegistryEvents(tx);

    expect(name).to.equal(pluginRepoName);
    expect(pluginRepo).not.undefined;
  });
});
