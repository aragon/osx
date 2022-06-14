import {expect} from 'chai';
import {ethers} from 'hardhat';
import {Repo} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';

const EVENTS = {
  NewVersion: 'NewVersion',
};

const zeroAddress = ethers.constants.AddressZero;
const emptyBytes = '0x00';

describe('APM: Repo', function () {
  let ownerAddress: string;
  let repo: Repo;
  let signers: any;

  function assertVersion(
    versionData: any,
    semanticVersion: any,
    pluginAddress: any,
    contentUri: any
  ) {
    const {
      semanticVersion: [maj, min, pat],
      pluginFactoryAddress,
      contentURI,
    } = versionData;

    expect(maj).to.equal(semanticVersion[0]); // major should match
    expect(min).to.equal(semanticVersion[1]); // minor should match
    expect(pat).to.equal(semanticVersion[2]); // patch should match

    expect(pluginFactoryAddress).to.equal(pluginAddress); // code should match
    expect(contentURI).to.equal(contentUri); // content should match
  }

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // deploy a repo and initialize
    const Repo = await ethers.getContractFactory('Repo');
    repo = await Repo.deploy();
    await repo.initialize(ownerAddress);
  });

  it('computes correct valid bumps', async function () {
    expect(await repo.isValidBump([0, 0, 0], [0, 0, 1])).to.equal(true);
    expect(await repo.isValidBump([0, 0, 0], [0, 1, 0])).to.equal(true);
    expect(await repo.isValidBump([0, 0, 0], [1, 0, 0])).to.equal(true);
    expect(await repo.isValidBump([1, 4, 7], [2, 0, 0])).to.equal(true);
    expect(await repo.isValidBump([147, 4, 7], [147, 5, 0])).to.equal(true);

    expect(await repo.isValidBump([0, 0, 1], [0, 0, 1])).to.equal(false);
    expect(await repo.isValidBump([0, 1, 0], [0, 2, 1])).to.equal(false);
    expect(await repo.isValidBump([0, 0, 2], [0, 0, 1])).to.equal(false);
    expect(await repo.isValidBump([2, 1, 0], [2, 2, 1])).to.equal(false);
    expect(await repo.isValidBump([1, 1, 1], [5, 0, 0])).to.equal(false);
    expect(await repo.isValidBump([5, 0, 0], [5, 2, 0])).to.equal(false);
    expect(await repo.isValidBump([0, 1, 2], [1, 1, 2])).to.equal(false);

    const maxUint16Value = Math.pow(2, 16) - 1; // 65535
    expect(
      await repo.isValidBump([0, 0, maxUint16Value], [0, 0, maxUint16Value - 1])
    ).to.equal(false);
  });

  // valid version as being a correct bump from 0.0.0
  it('cannot create invalid first version', async function () {
    await expect(
      repo.newVersion([1, 1, 0], zeroAddress, emptyBytes)
    ).to.be.revertedWith(customError('InvalidBump'));
  });

  context('creating initial version', async function () {
    let initialPluginAddress: any;
    const initialContent = '0x12';

    before(async function () {
      initialPluginAddress = await signers[8].getAddress(); // random addr, irrelevant
    });

    beforeEach(async function () {
      await repo.newVersion([1, 0, 0], initialPluginAddress, initialContent);
    });

    it('version is fetchable as latest', async () => {
      assertVersion(
        await repo.getLatest(),
        [1, 0, 0],
        initialPluginAddress,
        initialContent
      );
    });

    it('version is fetchable by semantic version', async () => {
      assertVersion(
        await repo.getBySemanticVersion([1, 0, 0]),
        [1, 0, 0],
        initialPluginAddress,
        initialContent
      );
    });

    it('version is fetchable by contract address', async () => {
      assertVersion(
        await repo.getLatestForContractAddress(initialPluginAddress),
        [1, 0, 0],
        initialPluginAddress,
        initialContent
      );
    });

    it('version is fetchable by version id', async () => {
      assertVersion(
        await repo.getByVersionId(1),
        [1, 0, 0],
        initialPluginAddress,
        initialContent
      );
    });

    it('setting contract address to 0 reuses last version address', async () => {
      await repo.newVersion([1, 1, 0], zeroAddress, initialContent);
      assertVersion(
        await repo.getByVersionId(2),
        [1, 1, 0],
        initialPluginAddress,
        initialContent
      );
    });

    it('fails when changing contract address in non major version', async () => {
      await expect(
        repo.newVersion(
          [1, 1, 0],
          await signers[6].getAddress(), // random addr, irrelevant
          initialContent
        )
      ).to.be.revertedWith(customError('InvalidVersion'));
    });

    it('fails when version bump is invalid', async () => {
      await expect(
        repo.newVersion([1, 2, 0], initialPluginAddress, initialContent)
      ).to.be.revertedWith(customError('InvalidBump'));
    });

    it('fails if requesting version 0', async () => {
      await expect(repo.getByVersionId(0)).to.be.revertedWith(
        customError('InexistentVersion')
      );
    });

    context('adding new version', () => {
      let newPluginAddress: any;
      const newContent = '0x13';

      before(async function () {
        newPluginAddress = await signers[10].getAddress(); // random addr, irrelevant
      });

      beforeEach(async function () {
        await repo.newVersion([2, 0, 0], newPluginAddress, newContent);
      });

      it('new version is fetchable as latest', async () => {
        assertVersion(
          await repo.getLatest(),
          [2, 0, 0],
          newPluginAddress,
          newContent
        );
      });

      it('new version is fetchable by semantic version', async () => {
        assertVersion(
          await repo.getBySemanticVersion([2, 0, 0]),
          [2, 0, 0],
          newPluginAddress,
          newContent
        );
      });

      it('new version is fetchable by contract address', async () => {
        assertVersion(
          await repo.getLatestForContractAddress(newPluginAddress),
          [2, 0, 0],
          newPluginAddress,
          newContent
        );
      });

      it('new version is fetchable by version id', async () => {
        assertVersion(
          await repo.getByVersionId(2),
          [2, 0, 0],
          newPluginAddress,
          newContent
        );
      });

      it('old version is fetchable by semantic version', async () => {
        assertVersion(
          await repo.getBySemanticVersion([1, 0, 0]),
          [1, 0, 0],
          initialPluginAddress,
          initialContent
        );
      });

      it('old version is fetchable by contract address', async () => {
        assertVersion(
          await repo.getLatestForContractAddress(initialPluginAddress),
          [1, 0, 0],
          initialPluginAddress,
          initialContent
        );
      });

      it('old version is fetchable by version id', async () => {
        assertVersion(
          await repo.getByVersionId(1),
          [1, 0, 0],
          initialPluginAddress,
          initialContent
        );
      });
    });
  });
});
