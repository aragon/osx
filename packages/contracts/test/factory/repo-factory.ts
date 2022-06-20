import {expect} from 'chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {AragonPluginRegistry, DAO, PluginRepoFactory} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';

const EVENTS = {
  NewPluginRepo: 'NewPluginRepo',
};

const zeroAddress = ethers.constants.AddressZero;

async function getAragonPluginRegistryEvents(tx: any) {
  const data = await tx.wait();
  const {events} = data;
  const {name, pluginRepo} = events.find(
    ({event}: {event: any}) => event === EVENTS.NewPluginRepo
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

describe('APM: PluginRepoFactory: ', function () {
  let signers: SignerWithAddress[];
  let aragonPluginRegistry: AragonPluginRegistry;
  let ownerAddress: string;
  let dao: DAO;
  let pluginRepoFactory: any;

  let mergedABI: any;
  let pluginRepoFactoryBytecode: any;

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
    await dao.initialize('0x00', ownerAddress, ethers.constants.AddressZero);

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

    // grant REGISTER_ROLE to pluginRepoFactory
    dao.grant(
      aragonPluginRegistry.address,
      pluginRepoFactory.address,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
    );
  });

  it('fail to create new pluginRepo with no REGISTER_ROLE', async () => {
    dao.revoke(
      aragonPluginRegistry.address,
      pluginRepoFactory.address,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
    );

    const pluginRepoName = 'my-pluginRepo';

    await expect(
      pluginRepoFactory.newPluginRepo(pluginRepoName, ownerAddress)
    ).to.be.revertedWith(
      customError(
        'ACLAuth',
        aragonPluginRegistry.address,
        aragonPluginRegistry.address,
        pluginRepoFactory.address,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
      )
    );
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
    const pluginRepoName = 'my-pluginRepo';
    const initialSemanticVersion = [0, 0, 0];
    const pluginFactoryAddress = zeroAddress;
    const contentURI = '0x00';

    await expect(
      pluginRepoFactory.newPluginRepoWithVersion(
        pluginRepoName,
        initialSemanticVersion,
        pluginFactoryAddress,
        contentURI,
        ownerAddress
      )
    ).to.be.revertedWith(customError('InvalidBump'));
  });

  it('create new pluginRepo with version', async () => {
    const pluginRepoName = 'my-pluginRepo';
    const initialSemanticVersion = [1, 0, 0];
    const pluginFactoryAddress = zeroAddress;
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
