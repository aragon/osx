import {expect} from 'chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {APMRegistry, DAO, RepoFactory} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';

const EVENTS = {
  NewRepo: 'NewRepo',
};

const zeroAddress = ethers.constants.AddressZero;

async function getAPMRegistryEvents(tx: any) {
  const data = await tx.wait();
  const {events} = data;
  const {name, repo} = events.find(
    ({event}: {event: any}) => event === EVENTS.NewRepo
  ).args;

  return {
    name,
    repo,
  };
}

async function getMergedABI() {
  // @ts-ignore
  const APMRegistryArtifact = await hre.artifacts.readArtifact('APMRegistry');
  // @ts-ignore
  const RepoFactoryArtifact = await hre.artifacts.readArtifact('RepoFactory');

  return {
    abi: [
      ...RepoFactoryArtifact.abi,
      ...APMRegistryArtifact.abi.filter((f: any) => f.type === 'event'),
    ],
    bytecode: RepoFactoryArtifact.bytecode,
  };
}

describe('APM: RepoFactory: ', function () {
  let signers: SignerWithAddress[];
  let apmRegistry: APMRegistry;
  let ownerAddress: string;
  let dao: DAO;
  let repoFactory: any;

  let mergedABI: any;
  let repoFactoryBytecode: any;

  async function getMergedABI() {
    // @ts-ignore
    const APMRegistryArtifact = await hre.artifacts.readArtifact('APMRegistry');
    // @ts-ignore
    const RepoFactoryArtifact = await hre.artifacts.readArtifact('RepoFactory');

    return {
      abi: [
        ...RepoFactoryArtifact.abi,
        ...APMRegistryArtifact.abi.filter((f: any) => f.type === 'event'),
      ],
      bytecode: RepoFactoryArtifact.bytecode,
    };
  }

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const {abi, bytecode} = await getMergedABI();

    mergedABI = abi;
    repoFactoryBytecode = bytecode;
  });

  beforeEach(async function () {
    // DAO
    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x00', ownerAddress, ethers.constants.AddressZero);

    // deploy and initialize APMRegistry
    const APMRegistry = await ethers.getContractFactory('APMRegistry');
    apmRegistry = await APMRegistry.deploy();
    await apmRegistry.initialize(dao.address);

    // deploy RepoFactory
    const RepoFactory = new ethers.ContractFactory(
      mergedABI,
      repoFactoryBytecode,
      signers[0]
    );
    repoFactory = await RepoFactory.deploy(apmRegistry.address);

    // grant REGISTER_ROLE to repoFactory
    dao.grant(
      apmRegistry.address,
      repoFactory.address,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
    );
  });

  it('fail to create new repo with no REGISTER_ROLE', async () => {
    dao.revoke(
      apmRegistry.address,
      repoFactory.address,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
    );

    const repoName = 'my-repo';

    await expect(
      repoFactory.newRepo(repoName, ownerAddress)
    ).to.be.revertedWith(
      customError(
        'ACLAuth',
        apmRegistry.address,
        apmRegistry.address,
        repoFactory.address,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
      )
    );
  });

  it('create new repo', async () => {
    const repoName = 'my-repo';

    let tx = await repoFactory.newRepo(repoName, ownerAddress);

    const {name, repo} = await getAPMRegistryEvents(tx);

    expect(name).to.equal(repoName);
    expect(repo).not.undefined;
  });

  it('fail creating new repo with wrong major version', async () => {
    const repoName = 'my-repo';
    const initialSemanticVersion = [0, 0, 0];
    const pluginFactoryAddress = zeroAddress;
    const contentURI = '0x00';

    await expect(
      repoFactory.newRepoWithVersion(
        repoName,
        initialSemanticVersion,
        pluginFactoryAddress,
        contentURI,
        ownerAddress
      )
    ).to.be.revertedWith(customError('InvalidBump'));
  });

  it('create new repo with version', async () => {
    const repoName = 'my-repo';
    const initialSemanticVersion = [1, 0, 0];
    const pluginFactoryAddress = zeroAddress;
    const contentURI = '0x00';

    let tx = await repoFactory.newRepoWithVersion(
      repoName,
      initialSemanticVersion,
      pluginFactoryAddress,
      contentURI,
      ownerAddress
    );

    const {name, repo} = await getAPMRegistryEvents(tx);

    expect(name).to.equal(repoName);
    expect(repo).not.undefined;
  });
});
