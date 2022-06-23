/// @notice This is an extention (adaptation) of the work at:
/// https://github.com/aragon/apm/blob/next/test/contracts/apm/apm_repo.js

import {expect} from 'chai';
import {ethers} from 'hardhat';
import {PluginRepo, PluginFactoryMock} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';
import {deployMockPluginFactory} from '../test-utils/repo';

const EVENTS = {
  NewVersion: 'NewVersion',
};

const emptyBytes = '0x00';

describe('PluginRepo', function () {
  let ownerAddress: string;
  let pluginRepo: PluginRepo;
  let signers: any;
  let pluginFactoryMock: PluginFactoryMock;

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
    // deploy a pluginRepo and initialize
    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    pluginRepo = await PluginRepo.deploy();
    await pluginRepo.initialize(ownerAddress);

    // deploy pluging factory mock
    pluginFactoryMock = await deployMockPluginFactory();
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
      pluginRepo.newVersion([1, 1, 0], pluginFactoryMock.address, emptyBytes)
    ).to.be.revertedWith('InvalidBump([0, 0, 0], [1, 1, 0])');
  });

  it('cannot create version with unsupported interface contract', async function () {
    const AdaptiveERC165 = await ethers.getContractFactory('AdaptiveERC165');
    let adaptiveERC165 = await AdaptiveERC165.deploy();

    await expect(
      pluginRepo.newVersion([1, 0, 0], adaptiveERC165.address, emptyBytes)
    ).to.be.revertedWith(customError('InvalidPluginInterface'));
  });

  it('cannot create version with random address', async function () {
    const randomAddress = await signers[8].getAddress();

    await expect(
      pluginRepo.newVersion([1, 0, 0], randomAddress, emptyBytes)
    ).to.be.revertedWith(customError('InvalidContractAddress'));
  });

  context('creating initial version', async function () {
    let initialPluginAddress: any;
    const initialContent = '0x12';

    before(async function () {
      const pluginFactoryMock = await deployMockPluginFactory();
      initialPluginAddress = pluginFactoryMock.address;
    });

    beforeEach(async function () {
      await pluginRepo.newVersion(
        [1, 0, 0],
        initialPluginAddress,
        initialContent
      );
    });

    it('version is fetchable as latest', async () => {
      assertVersion(
        await pluginRepo.getLatest(),
        [1, 0, 0],
        initialPluginAddress,
        initialContent
      );
    });

    it('version is fetchable by semantic version', async () => {
      assertVersion(
        await pluginRepo.getBySemanticVersion([1, 0, 0]),
        [1, 0, 0],
        initialPluginAddress,
        initialContent
      );
    });

    it('version is fetchable by contract address', async () => {
      assertVersion(
        await pluginRepo.getLatestForContractAddress(initialPluginAddress),
        [1, 0, 0],
        initialPluginAddress,
        initialContent
      );
    });

    it('version is fetchable by version id', async () => {
      assertVersion(
        await pluginRepo.getByVersionId(1),
        [1, 0, 0],
        initialPluginAddress,
        initialContent
      );
    });

    it('fails when changing base contract address in non major version', async () => {
      const pluginFactoryMock = await deployMockPluginFactory();

      await expect(
        pluginRepo.newVersion(
          [1, 1, 0],
          pluginFactoryMock.address,
          initialContent
        )
      ).to.be.revertedWith(customError('InvalidContractAddressForMajorBump'));
    });

    it('fails when version bump is invalid', async () => {
      await expect(
        pluginRepo.newVersion([1, 2, 0], initialPluginAddress, initialContent)
      ).to.be.revertedWith('InvalidBump([1, 0, 0], [1, 2, 0])');
    });

    it('fails if requesting version 0', async () => {
      await expect(pluginRepo.getByVersionId(0)).to.be.revertedWith(
        customError('VersionDoesNotExist')
      );
    });

    context('adding new version', () => {
      let newPluginAddress: any;
      const newContent = '0x13';

      before(async function () {
        const pluginFactoryMock = await deployMockPluginFactory();
        newPluginAddress = pluginFactoryMock.address;
      });

      beforeEach(async function () {
        await pluginRepo.newVersion([2, 0, 0], newPluginAddress, newContent);
      });

      it('new version is fetchable as latest', async () => {
        assertVersion(
          await pluginRepo.getLatest(),
          [2, 0, 0],
          newPluginAddress,
          newContent
        );
      });

      it('new version is fetchable by semantic version', async () => {
        assertVersion(
          await pluginRepo.getBySemanticVersion([2, 0, 0]),
          [2, 0, 0],
          newPluginAddress,
          newContent
        );
      });

      it('new version is fetchable by contract address', async () => {
        assertVersion(
          await pluginRepo.getLatestForContractAddress(newPluginAddress),
          [2, 0, 0],
          newPluginAddress,
          newContent
        );
      });

      it('new version is fetchable by version id', async () => {
        assertVersion(
          await pluginRepo.getByVersionId(2),
          [2, 0, 0],
          newPluginAddress,
          newContent
        );
      });

      it('old version is fetchable by semantic version', async () => {
        assertVersion(
          await pluginRepo.getBySemanticVersion([1, 0, 0]),
          [1, 0, 0],
          initialPluginAddress,
          initialContent
        );
      });

      it('old version is fetchable by contract address', async () => {
        assertVersion(
          await pluginRepo.getLatestForContractAddress(initialPluginAddress),
          [1, 0, 0],
          initialPluginAddress,
          initialContent
        );
      });

      it('old version is fetchable by version id', async () => {
        assertVersion(
          await pluginRepo.getByVersionId(1),
          [1, 0, 0],
          initialPluginAddress,
          initialContent
        );
      });
    });
  });
});
