// This is an extension (adaptation) of the work at:
// https://github.com/aragon/apm/blob/next/test/contracts/apm/apm_repo.js

import {expect} from 'chai';
import {ethers} from 'hardhat';

import {PluginRepo, PluginManagerMock} from '../../typechain';
import {deployMockPluginManager} from '../test-utils/repo';
import {customError} from '../test-utils/custom-error-helper';

const emptyBytes = '0x00';

describe('PluginRepo', function () {
  let ownerAddress: string;
  let pluginRepo: PluginRepo;
  let signers: any;
  let pluginManagerMock: PluginManagerMock;

  function assertVersion(
    actualVersionData: any,
    expectedSemanticVersion: any,
    expectedPluginManager: any,
    expectedContentUri: any
  ) {
    const {
      semanticVersion: [maj, min, pat],
      pluginManager,
      contentURI,
    } = actualVersionData;

    expect(maj).to.equal(expectedSemanticVersion[0]); // major should match
    expect(min).to.equal(expectedSemanticVersion[1]); // minor should match
    expect(pat).to.equal(expectedSemanticVersion[2]); // patch should match

    expect(pluginManager).to.equal(expectedPluginManager); // code should match
    expect(contentURI).to.equal(expectedContentUri); // content should match
  }

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // deploy a pluginRepo and initialize
    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    pluginRepo = await PluginRepo.deploy();
    await pluginRepo.initialize(ownerAddress);

    // deploy pluging factory mock
    pluginManagerMock = await deployMockPluginManager();
  });

  it('computes correct valid bumps', async function () {
    expect(await pluginRepo.isValidBump([0, 0, 0], [0, 0, 1])).to.equal(true);
    expect(await pluginRepo.isValidBump([0, 0, 0], [0, 1, 0])).to.equal(true);
    expect(await pluginRepo.isValidBump([0, 0, 0], [1, 0, 0])).to.equal(true);
    expect(await pluginRepo.isValidBump([1, 4, 7], [2, 0, 0])).to.equal(true);
    expect(await pluginRepo.isValidBump([147, 4, 7], [147, 5, 0])).to.equal(
      true
    );

    expect(await pluginRepo.isValidBump([0, 0, 1], [0, 0, 1])).to.equal(false);
    expect(await pluginRepo.isValidBump([0, 1, 0], [0, 2, 1])).to.equal(false);
    expect(await pluginRepo.isValidBump([0, 0, 2], [0, 0, 1])).to.equal(false);
    expect(await pluginRepo.isValidBump([2, 1, 0], [2, 2, 1])).to.equal(false);
    expect(await pluginRepo.isValidBump([1, 1, 1], [5, 0, 0])).to.equal(false);
    expect(await pluginRepo.isValidBump([5, 0, 0], [5, 2, 0])).to.equal(false);
    expect(await pluginRepo.isValidBump([0, 1, 2], [1, 1, 2])).to.equal(false);

    const maxUint16Value = Math.pow(2, 16) - 1; // 65535
    expect(
      await pluginRepo.isValidBump(
        [0, 0, maxUint16Value],
        [0, 0, maxUint16Value - 1]
      )
    ).to.equal(false);
  });

  // valid version as being a correct bump from 0.0.0
  it('cannot create invalid first version', async function () {
    await expect(
      pluginRepo.createVersion([1, 1, 0], pluginManagerMock.address, emptyBytes)
    ).to.be.revertedWith('InvalidBump([0, 0, 0], [1, 1, 0])');
  });

  it.skip('cannot create version with unsupported interface contract', async function () {
    const AdaptiveERC165 = await ethers.getContractFactory('AdaptiveERC165');
    let adaptiveERC165 = await AdaptiveERC165.deploy();
    
    // TODO: GIORGI fix after the repo is fixed...
    await expect(
      pluginRepo.createVersion([1, 0, 0], adaptiveERC165.address, emptyBytes)
    ).to.be.revertedWith(
      customError('InvalidPluginManagerInterface', adaptiveERC165.address)
    );
  });

  it('cannot create version with random address', async function () {
    const randomAddress = await signers[8].getAddress();

    await expect(
      pluginRepo.createVersion([1, 0, 0], randomAddress, emptyBytes)
    ).to.be.revertedWith(customError('InvalidContractAddress', randomAddress));
  });

  context('creating initial version', async function () {
    let initialPluginManager: any;
    const initialContent = '0x12';

    before(async function () {
      const pluginManagerMock = await deployMockPluginManager();
      initialPluginManager = pluginManagerMock.address;
    });

    beforeEach(async function () {
      await pluginRepo.createVersion(
        [1, 0, 0],
        initialPluginManager,
        initialContent
      );
    });

    it('version is fetchable as latest', async () => {
      assertVersion(
        await pluginRepo.getLatestVersion(),
        [1, 0, 0],
        initialPluginManager,
        initialContent
      );
    });

    it('version is fetchable by semantic version', async () => {
      assertVersion(
        await pluginRepo.getVersionBySemanticVersion([1, 0, 0]),
        [1, 0, 0],
        initialPluginManager,
        initialContent
      );
    });

    it('version is fetchable by plugin factory address', async () => {
      assertVersion(
        await pluginRepo.getVersionByPluginManager(initialPluginManager),
        [1, 0, 0],
        initialPluginManager,
        initialContent
      );
    });

    it('version is fetchable by version id', async () => {
      assertVersion(
        await pluginRepo.getVersionById(1),
        [1, 0, 0],
        initialPluginManager,
        initialContent
      );
    });

    it('fails when version bump is invalid', async () => {
      await expect(
        pluginRepo.createVersion(
          [1, 2, 0],
          initialPluginManager,
          initialContent
        )
      ).to.be.revertedWith('InvalidBump([1, 0, 0], [1, 2, 0])');
    });

    it('fails if requesting version 0', async () => {
      const versionIdx = 0;
      await expect(pluginRepo.getVersionById(versionIdx)).to.be.revertedWith(
        customError('VersionIndexDoesNotExist', versionIdx)
      );
    });

    context('adding new version', () => {
      let newPluginManager: string;
      const newContent = '0x13';

      before(async function () {
        const pluginManagerMock = await deployMockPluginManager();
        newPluginManager = pluginManagerMock.address;
      });

      beforeEach(async function () {
        await pluginRepo.createVersion([2, 0, 0], newPluginManager, newContent);
      });

      it('new version is fetchable as latest', async () => {
        assertVersion(
          await pluginRepo.getLatestVersion(),
          [2, 0, 0],
          newPluginManager,
          newContent
        );
      });

      it('new version is fetchable by semantic version', async () => {
        assertVersion(
          await pluginRepo.getVersionBySemanticVersion([2, 0, 0]),
          [2, 0, 0],
          newPluginManager,
          newContent
        );
      });

      it('new version is fetchable by contract address', async () => {
        assertVersion(
          await pluginRepo.getVersionByPluginManager(newPluginManager),
          [2, 0, 0],
          newPluginManager,
          newContent
        );
      });

      it('new version is fetchable by version id', async () => {
        assertVersion(
          await pluginRepo.getVersionById(2),
          [2, 0, 0],
          newPluginManager,
          newContent
        );
      });

      it('old version is fetchable by semantic version', async () => {
        assertVersion(
          await pluginRepo.getVersionBySemanticVersion([1, 0, 0]),
          [1, 0, 0],
          initialPluginManager,
          initialContent
        );
      });

      it('old version is fetchable by contract address', async () => {
        assertVersion(
          await pluginRepo.getVersionByPluginManager(initialPluginManager),
          [1, 0, 0],
          initialPluginManager,
          initialContent
        );
      });

      it('old version is fetchable by version id', async () => {
        assertVersion(
          await pluginRepo.getVersionById(1),
          [1, 0, 0],
          initialPluginManager,
          initialContent
        );
      });
    });
  });
});
