import {expect} from 'chai';
import {ethers} from 'hardhat';
import {customError} from '../test-utils/custom-error-helper';
import {DAO, Repo} from '../../typechain';

const EVENTS = {
  NewRepo: 'NewRepo',
};

describe('APM: APM-Registry', function () {
  let apmRegistry: any;
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

    // deploy and initialize APMRegistry
    const APMRegistry = await ethers.getContractFactory('APMRegistry');
    apmRegistry = await APMRegistry.deploy();
    await apmRegistry.initialize(dao.address);

    // deploy a repo and initialize
    const Repo = await ethers.getContractFactory('Repo');
    repo = await Repo.deploy();
    await repo.initialize(ownerAddress);

    // grant REGISTER_ROLE to registrer
    dao.grant(
      apmRegistry.address,
      ownerAddress,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REGISTER_ROLE'))
    );
  });

  it('Should register a new repo successfully', async function () {
    const repoName = 'my-repo';

    await expect(await apmRegistry.register(repoName, repo.address))
      .to.emit(apmRegistry, EVENTS.NewRepo)
      .withArgs(repoName, repo.address);

    expect(await apmRegistry.registrees(repo.address)).to.equal(true);
  });

  it('Should revert if repo already exists', async function () {
    const repoName = 'my-repo';

    await apmRegistry.register(repoName, repo.address);

    await expect(
      apmRegistry.register(repoName, repo.address)
    ).to.be.revertedWith(
      customError('ContractAlreadyRegistered', repo.address)
    );
  });
});
