// This is an extension (adaptation) of the work at:
// https://github.com/aragon/apm/blob/next/test/contracts/apm/apm_repo.js

import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {PluginRepo, PluginUUPSUpgradeableSetupV1Mock} from '../../typechain';
import {deployMockPluginSetup, deployNewPluginRepo} from '../test-utils/repo';

const emptyBytes = '0x00';

describe('PluginRepo', function () {
  let ownerAddress: string;
  let pluginRepo: PluginRepo;
  let signers: SignerWithAddress[];
  let pluginSetupMock: PluginUUPSUpgradeableSetupV1Mock;

  function assertVersion(
    actualVersionData: any,
    expectedSemanticVersion: any,
    expectedPluginSetup: any,
    expectedContentUri: any
  ) {
    const {
      semanticVersion: [maj, min, pat],
      pluginSetup,
      contentURI,
    } = actualVersionData;

    expect(maj).to.equal(expectedSemanticVersion[0]); // major should match
    expect(min).to.equal(expectedSemanticVersion[1]); // minor should match
    expect(pat).to.equal(expectedSemanticVersion[2]); // patch should match

    expect(pluginSetup).to.equal(expectedPluginSetup); // code should match
    expect(contentURI).to.equal(expectedContentUri); // content should match
  }

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // deploy a pluginRepo and initialize
    pluginRepo = await deployNewPluginRepo(ownerAddress);

    // deploy pluging factory mock
    pluginSetupMock = await deployMockPluginSetup();
  });

  // valid version as being a correct bump from 0.0.0
  it('cannot create invalid first version', async function () {
    await expect(
      pluginRepo.createVersion([1, 1, 0], pluginSetupMock.address, emptyBytes)
    )
      .to.be.revertedWithCustomError(pluginRepo, 'BumpInvalid')
      .withArgs([0, 0, 0], [1, 1, 0]);
  });

  it('cannot create version with unsupported interface contract', async function () {
    // Use the `DAO` contract for testing purposes here, because the interface differs from `PluginSetup`.
    const DAO = await ethers.getContractFactory('DAO');
    let contractNotBeingAPluginSetup = await DAO.deploy();
    await expect(
      pluginRepo.createVersion(
        [1, 0, 0],
        contractNotBeingAPluginSetup.address,
        emptyBytes
      )
    )
      .to.be.revertedWithCustomError(pluginRepo, 'InvalidPluginSetupInterface')
      .withArgs(contractNotBeingAPluginSetup.address);
  });

  it('cannot create version with random address', async function () {
    const randomAddress = await signers[8].getAddress();

    await expect(
      pluginRepo.createVersion([1, 0, 0], randomAddress, emptyBytes)
    ).to.be.revertedWith('Address: call to non-contract');
  });

  context('creating initial version', async function () {
    let initialPluginSetup: any;
    const initialContent = '0x12';

    before(async function () {
      const pluginSetupMock = await deployMockPluginSetup();
      initialPluginSetup = pluginSetupMock.address;
    });

    beforeEach(async function () {
      await pluginRepo.createVersion(
        [1, 0, 0],
        initialPluginSetup,
        initialContent
      );
    });

    it('version is fetchable as latest', async () => {
      assertVersion(
        await pluginRepo.getLatestVersion(),
        [1, 0, 0],
        initialPluginSetup,
        initialContent
      );
    });

    it('version is fetchable by semantic version', async () => {
      assertVersion(
        await pluginRepo.getVersionBySemanticVersion([1, 0, 0]),
        [1, 0, 0],
        initialPluginSetup,
        initialContent
      );
    });

    it('version is fetchable by plugin factory address', async () => {
      assertVersion(
        await pluginRepo.getVersionByPluginSetup(initialPluginSetup),
        [1, 0, 0],
        initialPluginSetup,
        initialContent
      );
    });

    it('version is fetchable by version id', async () => {
      assertVersion(
        await pluginRepo.getVersionById(1),
        [1, 0, 0],
        initialPluginSetup,
        initialContent
      );
    });

    it('fails when version bump is invalid', async () => {
      await expect(
        pluginRepo.createVersion([1, 2, 0], initialPluginSetup, initialContent)
      )
        .to.be.revertedWithCustomError(pluginRepo, 'BumpInvalid')
        .withArgs([1, 0, 0], [1, 2, 0]);
    });

    it('fails if requesting version 0', async () => {
      const versionIdx = 0;
      await expect(pluginRepo.getVersionById(versionIdx))
        .to.be.revertedWithCustomError(pluginRepo, 'VersionIndexDoesNotExist')
        .withArgs(versionIdx);
    });

    context('adding new version', () => {
      let newPluginSetup: string;
      const newContent = '0x13';

      before(async function () {
        const pluginSetupMock = await deployMockPluginSetup();
        newPluginSetup = pluginSetupMock.address;
      });

      beforeEach(async function () {
        await pluginRepo.createVersion([2, 0, 0], newPluginSetup, newContent);
      });

      it('new version is fetchable as latest', async () => {
        assertVersion(
          await pluginRepo.getLatestVersion(),
          [2, 0, 0],
          newPluginSetup,
          newContent
        );
      });

      it('new version is fetchable by semantic version', async () => {
        assertVersion(
          await pluginRepo.getVersionBySemanticVersion([2, 0, 0]),
          [2, 0, 0],
          newPluginSetup,
          newContent
        );
      });

      it('new version is fetchable by contract address', async () => {
        assertVersion(
          await pluginRepo.getVersionByPluginSetup(newPluginSetup),
          [2, 0, 0],
          newPluginSetup,
          newContent
        );
      });

      it('new version is fetchable by version id', async () => {
        assertVersion(
          await pluginRepo.getVersionById(2),
          [2, 0, 0],
          newPluginSetup,
          newContent
        );
      });

      it('old version is fetchable by semantic version', async () => {
        assertVersion(
          await pluginRepo.getVersionBySemanticVersion([1, 0, 0]),
          [1, 0, 0],
          initialPluginSetup,
          initialContent
        );
      });

      it('old version is fetchable by contract address', async () => {
        assertVersion(
          await pluginRepo.getVersionByPluginSetup(initialPluginSetup),
          [1, 0, 0],
          initialPluginSetup,
          initialContent
        );
      });

      it('old version is fetchable by version id', async () => {
        assertVersion(
          await pluginRepo.getVersionById(1),
          [1, 0, 0],
          initialPluginSetup,
          initialContent
        );
      });
    });
  });
});
