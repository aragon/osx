import {expect} from 'chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {AragonPluginRegistry, DAO} from '../../typechain';

import {customError} from '../test-utils/custom-error-helper';
import {deployMockPluginFactory} from '../test-utils/repo';

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
  let dao: DAO;
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
    dao = await DAO.deploy();
    await dao.initialize('0x00', ownerAddress, zeroAddress);

    // deploy and initialize AragonPluginRegistry
    const AragonPluginRegistry = await ethers.getContractFactory(
      'AragonPluginRegistry'
    );
    aragonPluginRegistry = await AragonPluginRegistry.deploy();
    await aragonPluginRegistry.initialize(dao.address);

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
    dao.grant(
      aragonPluginRegistry.address,
      pluginRepoFactory.address,
      ethers.utils.id('REGISTER_PERMISSION_ID')
    );
  });

  it('fail to create new pluginRepo with no REGISTER_PERMISSION_ID', async () => {
    dao.revoke(
      aragonPluginRegistry.address,
      pluginRepoFactory.address,
      ethers.utils.id('REGISTER_PERMISSION_ID')
    );

    const pluginRepoName = 'my-pluginRepo';

    await expect(
      pluginRepoFactory.newPluginRepo(pluginRepoName, ownerAddress)
    ).to.be.revertedWith(
      customError(
        'PermissionUnauthorized',
        aragonPluginRegistry.address,
        aragonPluginRegistry.address,
        pluginRepoFactory.address,
        ethers.utils.id('REGISTER_PERMISSION_ID')
      )
    );
  });

  it('fail to create new pluginRepo with empty name', async () => {
    const pluginRepoName = '';

    await expect(
      pluginRepoFactory.newPluginRepo(pluginRepoName, ownerAddress)
    ).to.be.revertedWith(customError('EmptyName'));
  });

  it('create new pluginRepo', async () => {
    const pluginRepoName = 'my-pluginRepo';

    let tx = await pluginRepoFactory.newPluginRepo(
      pluginRepoName,
      ownerAddress
    );

    const {name, pluginRepo} = await getAragonPluginRegistryEvents(tx);

    expect(name).to.equal(pluginRepoName);
    expect(pluginRepo).not.undefined;
  });

  it('fail creating new pluginRepo with wrong major version', async () => {
    const pluginFactoryMock = await deployMockPluginFactory();

    const pluginRepoName = 'my-pluginRepo';
    const initialSemanticVersion = [0, 0, 0];
    const pluginFactoryAddress = pluginFactoryMock.address;
    const contentURI = '0x00';

    await expect(
      pluginRepoFactory.newPluginRepoWithVersion(
        pluginRepoName,
        initialSemanticVersion,
        pluginFactoryAddress,
        contentURI,
        ownerAddress
      )
    ).to.be.revertedWith('InvalidBump([0, 0, 0], [0, 0, 0])');
  });

  it('create new pluginRepo with version', async () => {
    const pluginFactoryMock = await deployMockPluginFactory();

    const pluginRepoName = 'my-pluginRepo';
    const initialSemanticVersion = [1, 0, 0];
    const pluginFactoryAddress = pluginFactoryMock.address;
    const contentURI = '0x00';

    let tx = await pluginRepoFactory.newPluginRepoWithVersion(
      pluginRepoName,
      initialSemanticVersion,
      pluginFactoryAddress,
      contentURI,
      ownerAddress
    );

    const {name, pluginRepo} = await getAragonPluginRegistryEvents(tx);

    expect(name).to.equal(pluginRepoName);
    expect(pluginRepo).not.undefined;
  });
});
