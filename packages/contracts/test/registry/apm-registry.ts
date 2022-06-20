import {expect} from 'chai';
import {ethers} from 'hardhat';
import {customError} from '../test-utils/custom-error-helper';
import {DAO, Repo} from '../../typechain';

const EVENTS = {
  NewRepo: 'NewRepo',
};

describe('APM: APM-Registry', function () {
  let aragonPluginRegistry: any;
  let ownerAddress: string;
  let dao: DAO;
  let repo: Repo;

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

    // deploy a repo and initialize
    const Repo = await ethers.getContractFactory('Repo');
    repo = await Repo.deploy();
    await repo.initialize(ownerAddress);

    // grant REGISTER_ROLE to registrer
    dao.grant(
      aragonPluginRegistry.address,
      ownerAddress,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
    );
  });

  it('Should register a new repo successfully', async function () {
    const repoName = 'my-repo';

    await expect(await aragonPluginRegistry.register(repoName, repo.address))
      .to.emit(aragonPluginRegistry, EVENTS.NewRepo)
      .withArgs(repoName, repo.address);

    expect(await aragonPluginRegistry.registrees(repo.address)).to.equal(true);
  });

  it('Should revert if repo already exists', async function () {
    const repoName = 'my-repo';

    await aragonPluginRegistry.register(repoName, repo.address);

    await expect(
      aragonPluginRegistry.register(repoName, repo.address)
    ).to.be.revertedWith(
      customError('ContractAlreadyRegistered', repo.address)
    );
  });
});
