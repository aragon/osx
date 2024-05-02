// This is an extension (adaptation) of the work at:
// https://github.com/aragon/apm/blob/next/test/contracts/apm/apm_repo.js
import {
  PluginRepo,
  PluginRepo__factory,
  PluginUUPSUpgradeableSetupV1Mock,
  PlaceholderSetup__factory,
  IERC165__factory,
  IPluginRepo__factory,
  IProtocolVersion__factory,
} from '../../../typechain';
import {PluginRepo__factory as PluginRepo_V1_0_0__factory} from '../../../typechain/@aragon/osx-v1.0.1/framework/plugin/repo/PluginRepo.sol';
import {PluginRepo__factory as PluginRepo_V1_3_0__factory} from '../../../typechain/@aragon/osx-v1.3.0/framework/plugin/repo/PluginRepo.sol';
import {OZ_INITIALIZED_SLOT_POSITION} from '../../../utils/storage';
import {ZERO_BYTES32} from '../../test-utils/dao';
import {osxContractsVersion} from '../../test-utils/protocol-version';
import {tagHash} from '../../test-utils/psp/hash-helpers';
import {
  deployMockPluginSetup,
  deployNewPluginRepo,
} from '../../test-utils/repo';
import {
  getProtocolVersion,
  deployAndUpgradeFromToCheck,
  deployAndUpgradeSelfCheck,
} from '../../test-utils/uups-upgradeable';
import {PLUGIN_REPO_PERMISSIONS, getInterfaceId} from '@aragon/osx-commons-sdk';
import {PluginUUPSUpgradeableV1Mock__factory} from '@aragon/osx-ethers-v1.2.0';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ContractFactory} from 'ethers';
import {ethers} from 'hardhat';

const emptyBytes = '0x00';
const BUILD_METADATA = '0x11';
const RELEASE_METADATA = '0x1111';
const MAINTAINER_PERMISSION_ID = ethers.utils.id('MAINTAINER_PERMISSION');

describe('PluginRepo', function () {
  let ownerAddress: string;
  let pluginRepo: PluginRepo;
  let signers: SignerWithAddress[];
  let pluginSetupMock: PluginUUPSUpgradeableSetupV1Mock;
  let initArgs: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // deploy a pluginRepo and initialize
    pluginRepo = await deployNewPluginRepo(signers[0]);

    // deploy pluging factory mock
    pluginSetupMock = await deployMockPluginSetup(signers[0]);
  });

  describe('Initialize', () => {
    it('initializes correctly', async () => {
      const permissions = [
        ethers.utils.id('MAINTAINER_PERMISSION'),
        ethers.utils.id('UPGRADE_REPO_PERMISSION'),
        ethers.utils.id('ROOT_PERMISSION'),
      ];

      for (let i = 0; i < permissions.length; i++) {
        expect(
          await pluginRepo.isGranted(
            pluginRepo.address,
            ownerAddress,
            permissions[i],
            '0x'
          )
        ).to.be.true;
      }
    });

    describe('Upgrades', () => {
      let legacyContractFactory: ContractFactory;
      let currentContractFactory: ContractFactory;

      before(() => {
        currentContractFactory = new PluginRepo__factory(signers[0]);

        initArgs = {
          initialOwner: ownerAddress,
        };
      });

      it('upgrades to a new implementation', async () => {
        await deployAndUpgradeSelfCheck(
          signers[0],
          signers[1],
          initArgs,
          'initialize',
          currentContractFactory,
          PLUGIN_REPO_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID
        );
      });

      it('upgrades from v1.0.0', async () => {
        legacyContractFactory = new PluginRepo_V1_0_0__factory(signers[0]);

        const {fromImplementation, toImplementation} =
          await deployAndUpgradeFromToCheck(
            signers[0],
            signers[1],
            initArgs,
            'initialize',
            legacyContractFactory,
            currentContractFactory,
            PLUGIN_REPO_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID
          );
        expect(toImplementation).to.not.equal(fromImplementation);

        const fromProtocolVersion = await getProtocolVersion(
          legacyContractFactory.attach(fromImplementation)
        );
        const toProtocolVersion = await getProtocolVersion(
          currentContractFactory.attach(toImplementation)
        );

        expect(fromProtocolVersion).to.not.deep.equal(toProtocolVersion);
        expect(fromProtocolVersion).to.deep.equal([1, 0, 0]);
        expect(toProtocolVersion).to.deep.equal(osxContractsVersion());
      });

      it('from v1.3.0', async () => {
        legacyContractFactory = new PluginRepo_V1_3_0__factory(signers[0]);

        const {fromImplementation, toImplementation} =
          await deployAndUpgradeFromToCheck(
            signers[0],
            signers[1],
            initArgs,
            'initialize',
            legacyContractFactory,
            currentContractFactory,
            PLUGIN_REPO_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID
          );
        expect(toImplementation).to.not.equal(fromImplementation);

        const fromProtocolVersion = await getProtocolVersion(
          legacyContractFactory.attach(fromImplementation)
        );
        const toProtocolVersion = await getProtocolVersion(
          currentContractFactory.attach(toImplementation)
        );

        expect(fromProtocolVersion).to.not.deep.equal(toProtocolVersion);
        expect(fromProtocolVersion).to.deep.equal([1, 3, 0]);
        expect(toProtocolVersion).to.deep.equal(osxContractsVersion());
      });
    });
    describe('InitializeFrom', () => {
      it('increments `_initialized` to `1`', async () => {
        // Expect the contract to be initialized  with `_initialized = 1`.
        expect(
          ethers.BigNumber.from(
            await ethers.provider.getStorageAt(
              pluginRepo.address,
              OZ_INITIALIZED_SLOT_POSITION
            )
          ).toNumber()
        ).to.equal(1);

        // Call `initializeFrom` with version 1.3.0. and revert
        await expect(pluginRepo.initializeFrom([1, 3, 0], emptyBytes)).to.be
          .reverted;
      });
    });
    describe('CreateInitialVersion', () => {
      const INITIAL_RELEASE = 2;
      const INITIAL_BUILD = 4;
      it('reverts if the caller does not have permission', async () => {
        await expect(
          pluginRepo
            .connect(signers[2])
            .createInitialVersion(
              INITIAL_RELEASE,
              INITIAL_BUILD,
              pluginSetupMock.address,
              BUILD_METADATA,
              RELEASE_METADATA
            )
        )
          .to.be.revertedWithCustomError(pluginRepo, 'Unauthorized')
          .withArgs(
            pluginRepo.address,
            signers[2].address,
            MAINTAINER_PERMISSION_ID
          );
      });
      it('Should revert if the plugin setup does not support the `IPluginSetup` interface', async () => {
        expect(
          pluginRepo.createInitialVersion(
            INITIAL_RELEASE,
            INITIAL_BUILD,
            ownerAddress,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        ).to.be.revertedWithCustomError(
          pluginRepo,
          'InvalidPluginSetupInterface'
        );
      });
      it('Should revert if a version was already created', async () => {
        await pluginRepo.createVersion(
          1,
          pluginSetupMock.address,
          BUILD_METADATA,
          RELEASE_METADATA
        );
        await expect(
          pluginRepo.createInitialVersion(
            INITIAL_RELEASE,
            INITIAL_BUILD,
            pluginSetupMock.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        ).to.be.revertedWithCustomError(
          pluginRepo,
          'PluginRepoAlreadyInitialized'
        );
      });
      it('Should revert if the release number is 0', async () => {
        await expect(
          pluginRepo.createInitialVersion(
            0,
            INITIAL_BUILD,
            pluginSetupMock.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        ).to.be.revertedWithCustomError(pluginRepo, 'ReleaseZeroNotAllowed');
      });
      it('should revert if the release metadata is empty', async () => {
        await expect(
          pluginRepo.createInitialVersion(
            INITIAL_RELEASE,
            INITIAL_BUILD,
            pluginSetupMock.address,
            BUILD_METADATA,
            '0x'
          )
        ).to.be.revertedWithCustomError(pluginRepo, 'EmptyReleaseMetadata');
      });
      it('Should create the initial version and emit the correct events', async () => {
        await expect(
          pluginRepo.createInitialVersion(
            INITIAL_RELEASE,
            INITIAL_BUILD,
            pluginSetupMock.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(
            INITIAL_RELEASE,
            INITIAL_BUILD,
            pluginSetupMock.address,
            BUILD_METADATA
          )
          .to.emit(pluginRepo, 'ReleaseMetadataUpdated')
          .withArgs(INITIAL_RELEASE, RELEASE_METADATA);

        expect(await pluginRepo.latestRelease()).to.equal(INITIAL_RELEASE);
        expect(await pluginRepo.buildCount(INITIAL_RELEASE)).to.equal(
          INITIAL_BUILD
        );
      });
      it('Should create the initial version and then continue creating versions with createVersion', async () => {
        await expect(
          pluginRepo.createInitialVersion(
            INITIAL_RELEASE,
            INITIAL_BUILD,
            pluginSetupMock.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(
            INITIAL_RELEASE,
            INITIAL_BUILD,
            pluginSetupMock.address,
            BUILD_METADATA
          )
          .to.emit(pluginRepo, 'ReleaseMetadataUpdated')
          .withArgs(INITIAL_RELEASE, RELEASE_METADATA);

        expect(await pluginRepo.latestRelease()).to.equal(INITIAL_RELEASE);
        expect(await pluginRepo.buildCount(INITIAL_RELEASE)).to.equal(
          INITIAL_BUILD
        );

        await pluginRepo.createVersion(
          INITIAL_RELEASE,
          pluginSetupMock.address,
          BUILD_METADATA,
          RELEASE_METADATA
        );
        expect(await pluginRepo.latestRelease()).to.equal(INITIAL_RELEASE);
        expect(await pluginRepo.buildCount(INITIAL_RELEASE)).to.equal(
          INITIAL_BUILD + 1
        );
      });
    });

    describe('ERC-165', async () => {
      it('does not support the empty interface', async () => {
        expect(await pluginRepo.supportsInterface('0xffffffff')).to.be.false;
      });

      it('supports the `IERC165` interface', async () => {
        const iface = IERC165__factory.createInterface();
        expect(await pluginRepo.supportsInterface(getInterfaceId(iface))).to.be
          .true;
      });

      it('supports the `IPluginRepo` interface', async () => {
        const iface = IPluginRepo__factory.createInterface();
        expect(getInterfaceId(iface)).to.equal('0x0d19035f');
        expect(await pluginRepo.supportsInterface(getInterfaceId(iface))).to.be
          .true;
      });

      it('supports the `IProtocolVersion` interface', async () => {
        const iface = IProtocolVersion__factory.createInterface();
        expect(await pluginRepo.supportsInterface(getInterfaceId(iface))).to.be
          .true;
      });
    });

    describe('Protocol version', async () => {
      it('returns the current protocol version', async () => {
        expect(await pluginRepo.protocolVersion()).to.deep.equal(
          osxContractsVersion()
        );
      });
    });

    describe('CreateVersion: ', async () => {
      it('reverts if the caller does not have permission', async () => {
        await expect(
          pluginRepo
            .connect(signers[2])
            .createVersion(1, pluginSetupMock.address, emptyBytes, emptyBytes)
        )
          .to.be.revertedWithCustomError(pluginRepo, 'Unauthorized')
          .withArgs(
            pluginRepo.address,
            signers[2].address,
            MAINTAINER_PERMISSION_ID
          );
      });

      it('fails if the plugin setup does not support the `IPluginSetup` interface', async function () {
        // If EOA Address is passed
        await expect(
          pluginRepo.createVersion(1, ownerAddress, emptyBytes, emptyBytes)
        ).to.be.revertedWithCustomError(
          pluginRepo,
          'InvalidPluginSetupInterface'
        );

        // If a contract is passed, but doesn't support `IPluginSetup`.
        await expect(
          pluginRepo.createVersion(
            1,
            pluginRepo.address,
            emptyBytes,
            emptyBytes
          )
        ).to.be.revertedWithCustomError(
          pluginRepo,
          'InvalidPluginSetupInterface'
        );

        // If a contract is passed, but doesn't have `supportsInterface` signature described in the contract.
        const randomContract = await new PluginUUPSUpgradeableV1Mock__factory(
          signers[0]
        ).deploy();
        await expect(
          pluginRepo.createVersion(
            1,
            randomContract.address,
            emptyBytes,
            emptyBytes
          )
        ).to.be.revertedWithCustomError(
          pluginRepo,
          'InvalidPluginSetupInterface'
        );
      });

      it('fails if the release number is 0', async () => {
        await expect(
          pluginRepo.createVersion(
            0,
            pluginSetupMock.address,
            emptyBytes,
            emptyBytes
          )
        ).to.be.revertedWithCustomError(pluginRepo, 'ReleaseZeroNotAllowed');
      });

      it('fails if the release is incremented by more than 1', async () => {
        await pluginRepo.createVersion(
          1,
          pluginSetupMock.address,
          BUILD_METADATA,
          RELEASE_METADATA
        );

        await expect(
          pluginRepo.createVersion(
            3,
            pluginSetupMock.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        ).to.be.revertedWithCustomError(pluginRepo, 'InvalidReleaseIncrement');
      });

      it('fails for the first release, if `releaseMetadata` is empty', async () => {
        await expect(
          pluginRepo.createVersion(
            1,
            pluginSetupMock.address,
            BUILD_METADATA,
            '0x'
          )
        ).to.be.revertedWithCustomError(pluginRepo, 'EmptyReleaseMetadata');
      });

      it('fails if the same plugin setup exists in another release', async () => {
        const pluginSetup_1 = await deployMockPluginSetup(signers[0]);
        const pluginSetup_2 = await deployMockPluginSetup(signers[0]);

        // create release 1
        await pluginRepo.createVersion(
          1,
          pluginSetup_1.address,
          BUILD_METADATA,
          RELEASE_METADATA
        );

        // create release 2
        await pluginRepo.createVersion(
          2,
          pluginSetup_2.address,
          BUILD_METADATA,
          RELEASE_METADATA
        );

        // release 3 should fail as it's using the same plugin of first release
        await expect(
          pluginRepo.createVersion(
            3,
            pluginSetup_1.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        )
          .to.be.revertedWithCustomError(
            pluginRepo,
            'PluginSetupAlreadyInPreviousRelease'
          )
          .withArgs(1, 1, pluginSetup_1.address);

        // release 3 should fail as it's using the same plugin of second release
        await expect(
          pluginRepo.createVersion(
            3,
            pluginSetup_2.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        )
          .to.be.revertedWithCustomError(
            pluginRepo,
            'PluginSetupAlreadyInPreviousRelease'
          )
          .withArgs(2, 1, pluginSetup_2.address);
      });

      it('successfully creates a version and emits the correct events', async () => {
        await expect(
          pluginRepo.createVersion(
            1,
            pluginSetupMock.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(1, 1, pluginSetupMock.address, BUILD_METADATA)
          .to.emit(pluginRepo, 'ReleaseMetadataUpdated')
          .withArgs(1, RELEASE_METADATA);
      });

      it('correctly increases and emits the build number', async () => {
        await expect(
          pluginRepo.createVersion(
            1,
            pluginSetupMock.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(1, 1, pluginSetupMock.address, BUILD_METADATA);

        expect(await pluginRepo.buildCount(1)).to.equal(1);

        await expect(
          pluginRepo.createVersion(
            1,
            pluginSetupMock.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(1, 2, pluginSetupMock.address, BUILD_METADATA);

        expect(await pluginRepo.buildCount(1)).to.equal(2);
      });

      it('correctly increases and emits release number', async () => {
        await expect(
          pluginRepo.createVersion(
            1,
            pluginSetupMock.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(1, 1, pluginSetupMock.address, BUILD_METADATA);

        expect(await pluginRepo.latestRelease()).to.equal(1);

        // don't repeat the same plugin setup in the 2nd release
        // otherwise it will revert.
        const pluginSetupMock_2 = await deployMockPluginSetup(signers[0]);

        await expect(
          pluginRepo.createVersion(
            2,
            pluginSetupMock_2.address,
            BUILD_METADATA,
            RELEASE_METADATA
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(2, 1, pluginSetupMock_2.address, BUILD_METADATA);

        expect(await pluginRepo.latestRelease()).to.equal(2);
      });

      it('succeeds if release already exists and release metadata is empty', async () => {
        await pluginRepo.createVersion(
          1,
          pluginSetupMock.address,
          BUILD_METADATA,
          RELEASE_METADATA
        );

        await expect(
          pluginRepo.createVersion(
            1,
            pluginSetupMock.address,
            BUILD_METADATA,
            '0x'
          )
        ).to.not.emit(pluginRepo, 'ReleaseMetadataUpdated');
      });

      it('allows to create placeholder builds for the same release', async () => {
        const PlaceholderSetup = new PlaceholderSetup__factory(signers[0]);
        const placeholder1 = await PlaceholderSetup.deploy();
        const placeholder2 = await PlaceholderSetup.deploy();

        // Release 1
        await expect(
          pluginRepo.createVersion(
            1,
            placeholder1.address,
            ZERO_BYTES32,
            ZERO_BYTES32
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(1, 1, placeholder1.address, ZERO_BYTES32);

        await expect(
          pluginRepo.createVersion(
            1,
            placeholder1.address,
            ZERO_BYTES32,
            ZERO_BYTES32
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(1, 2, placeholder1.address, ZERO_BYTES32);

        // Release 2
        await expect(
          pluginRepo.createVersion(
            2,
            placeholder2.address,
            ZERO_BYTES32,
            ZERO_BYTES32
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(2, 1, placeholder2.address, ZERO_BYTES32);

        await expect(
          pluginRepo.createVersion(
            2,
            placeholder2.address,
            ZERO_BYTES32,
            ZERO_BYTES32
          )
        )
          .to.emit(pluginRepo, 'VersionCreated')
          .withArgs(2, 2, placeholder2.address, ZERO_BYTES32);
      });
    });

    describe('updateReleaseMetadata', async () => {
      it('reverts if caller does not have permission', async () => {
        await expect(
          pluginRepo
            .connect(signers[2])
            .updateReleaseMetadata(1, RELEASE_METADATA)
        )
          .to.be.revertedWithCustomError(pluginRepo, 'Unauthorized')
          .withArgs(
            pluginRepo.address,
            signers[2].address,
            MAINTAINER_PERMISSION_ID
          );
      });
      it('reverts if release is 0', async () => {
        await expect(
          pluginRepo.updateReleaseMetadata(0, emptyBytes)
        ).to.be.revertedWithCustomError(pluginRepo, 'ReleaseZeroNotAllowed');
      });

      it('reverts if release does not exist', async () => {
        await expect(
          pluginRepo.updateReleaseMetadata(1, emptyBytes)
        ).to.be.revertedWithCustomError(pluginRepo, 'ReleaseDoesNotExist');
      });

      it('reverts if metadata length is 0', async () => {
        await pluginRepo.createVersion(
          1,
          pluginSetupMock.address,
          BUILD_METADATA,
          RELEASE_METADATA
        );
        await expect(
          pluginRepo.updateReleaseMetadata(1, '0x')
        ).to.be.revertedWithCustomError(pluginRepo, 'EmptyReleaseMetadata');
      });

      it('updates metadata for the release that already exists and emits the "ReleaseMetadataUpdated" event', async () => {
        await pluginRepo.createVersion(
          1,
          pluginSetupMock.address,
          BUILD_METADATA,
          RELEASE_METADATA
        );
        await expect(pluginRepo.updateReleaseMetadata(1, '0x11'))
          .to.emit(pluginRepo, 'ReleaseMetadataUpdated')
          .withArgs(1, '0x11');
      });
    });

    describe('Different types of getVersions:', async () => {
      // R - release, B - build
      let pluginSetup_R1_B1: PluginUUPSUpgradeableSetupV1Mock;
      let pluginSetup_R1_B2: PluginUUPSUpgradeableSetupV1Mock;
      let pluginSetup_R2_B1: PluginUUPSUpgradeableSetupV1Mock;
      let BUILD_METADATA_R1_B1 = BUILD_METADATA;
      let BUILD_METADATA_R1_B2 = `${BUILD_METADATA}11`;
      let BUILD_METADATA_R2_B1 = `${BUILD_METADATA}1111`;

      beforeEach(async () => {
        pluginSetup_R1_B1 = pluginSetupMock;
        pluginSetup_R1_B2 = await deployMockPluginSetup(signers[0]);
        pluginSetup_R2_B1 = await deployMockPluginSetup(signers[0]);

        await pluginRepo.createVersion(
          1,
          pluginSetup_R1_B1.address,
          BUILD_METADATA_R1_B1,
          RELEASE_METADATA
        );

        await pluginRepo.createVersion(
          1,
          pluginSetup_R1_B2.address,
          BUILD_METADATA_R1_B2,
          RELEASE_METADATA
        );

        await pluginRepo.createVersion(
          2,
          pluginSetup_R2_B1.address,
          BUILD_METADATA_R2_B1,
          RELEASE_METADATA
        );
      });

      describe('getLatestVersion', async () => {
        it('reverts if release does not exist', async () => {
          await expect(pluginRepo['getLatestVersion(uint8)'](3))
            .to.be.revertedWithCustomError(
              pluginRepo,
              'VersionHashDoesNotExist'
            )
            .withArgs(tagHash(3, 0));
        });

        it('correctly returns the Version per release', async () => {
          const func = pluginRepo['getLatestVersion(uint8)'];

          expect(await func(1)).to.deep.equal([
            [1, 2],
            pluginSetup_R1_B2.address,
            BUILD_METADATA_R1_B2,
          ]);

          expect(await func(2)).to.deep.equal([
            [2, 1],
            pluginSetup_R2_B1.address,
            BUILD_METADATA_R2_B1,
          ]);
        });

        it('reverts if plugin setup does not exist', async () => {
          await expect(pluginRepo['getLatestVersion(address)'](ownerAddress))
            .to.be.revertedWithCustomError(
              pluginRepo,
              'VersionHashDoesNotExist'
            )
            .withArgs(
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            );
        });

        it('correctly returns the Version per plugin setup', async () => {
          const func = pluginRepo['getLatestVersion(address)'];

          expect(await func(pluginSetup_R1_B1.address)).to.deep.equal([
            [1, 1],
            pluginSetup_R1_B1.address,
            BUILD_METADATA_R1_B1,
          ]);

          expect(await func(pluginSetup_R1_B2.address)).to.deep.equal([
            [1, 2],
            pluginSetup_R1_B2.address,
            BUILD_METADATA_R1_B2,
          ]);

          expect(await func(pluginSetup_R2_B1.address)).to.deep.equal([
            [2, 1],
            pluginSetup_R2_B1.address,
            BUILD_METADATA_R2_B1,
          ]);
        });
      });

      describe('getVersion', async () => {
        it('reverts if `Tag` does not exist', async () => {
          await expect(
            pluginRepo['getVersion((uint8,uint16))']({release: 1, build: 3})
          )
            .to.be.revertedWithCustomError(
              pluginRepo,
              'VersionHashDoesNotExist'
            )
            .withArgs(tagHash(1, 3));
        });

        it('correctly returns the version per `Tag`', async () => {
          const func = pluginRepo['getVersion((uint8,uint16))'];

          expect(await func({release: 1, build: 1})).to.deep.equal([
            [1, 1],
            pluginSetup_R1_B1.address,
            BUILD_METADATA_R1_B1,
          ]);

          expect(await func({release: 1, build: 2})).to.deep.equal([
            [1, 2],
            pluginSetup_R1_B2.address,
            BUILD_METADATA_R1_B2,
          ]);

          expect(await func({release: 2, build: 1})).to.deep.equal([
            [2, 1],
            pluginSetup_R2_B1.address,
            BUILD_METADATA_R2_B1,
          ]);
        });

        it('correctly returns the version per Tag hash', async () => {
          const func = pluginRepo['getVersion(bytes32)'];

          expect(await func(tagHash(1, 1))).to.deep.equal([
            [1, 1],
            pluginSetup_R1_B1.address,
            BUILD_METADATA_R1_B1,
          ]);

          expect(await func(tagHash(1, 2))).to.deep.equal([
            [1, 2],
            pluginSetup_R1_B2.address,
            BUILD_METADATA_R1_B2,
          ]);

          expect(await func(tagHash(2, 1))).to.deep.equal([
            [2, 1],
            pluginSetup_R2_B1.address,
            BUILD_METADATA_R2_B1,
          ]);
        });
      });
    });
  });
});
