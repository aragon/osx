// SPDX-License-Identifier:    AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {IProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/IProtocolVersion.sol";
import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/PluginSetup.sol";

import {PermissionManager} from "../../../core/permission/PermissionManager.sol";
import {IPluginRepo} from "./IPluginRepo.sol";

/// @title PluginRepo
/// @author Aragon Association - 2020 - 2023
/// @notice The plugin repository contract required for managing and publishing different plugin versions within the Aragon DAO framework.
/// @custom:security-contact sirt@aragon.org
contract PluginRepo is
    Initializable,
    ERC165Upgradeable,
    IPluginRepo,
    UUPSUpgradeable,
    ProtocolVersion,
    PermissionManager
{
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;

    /// @notice The ID of the permission required to call the `createVersion` function.
    bytes32 public constant MAINTAINER_PERMISSION_ID = keccak256("MAINTAINER_PERMISSION");

    /// @notice The ID of the permission required to call the `createVersion` function.
    bytes32 public constant UPGRADE_REPO_PERMISSION_ID = keccak256("UPGRADE_REPO_PERMISSION");

    /// @notice The mapping between release and build numbers.
    mapping(uint8 => uint16) internal buildsPerRelease;

    /// @notice The mapping between the version hash and the corresponding version information.
    mapping(bytes32 => Version) internal versions;

    /// @notice The mapping between the plugin setup address and its corresponding version hash.
    mapping(address => bytes32) internal latestTagHashForPluginSetup;

    /// @notice The ID of the latest release.
    /// @dev The maximum release number is 255.
    uint8 public latestRelease;

    /// @notice Thrown if a version does not exist.
    /// @param versionHash The tag hash.
    error VersionHashDoesNotExist(bytes32 versionHash);

    /// @notice Thrown if a plugin setup contract does not inherit from `PluginSetup`.
    error InvalidPluginSetupInterface();

    /// @notice Thrown if a release number is zero.
    error ReleaseZeroNotAllowed();

    /// @notice Thrown if a release number is incremented by more than one.
    /// @param latestRelease The latest release number.
    /// @param newRelease The new release number.
    error InvalidReleaseIncrement(uint8 latestRelease, uint8 newRelease);

    /// @notice Thrown if the same plugin setup contract exists already in a previous releases.
    /// @param release The release number of the already existing plugin setup.
    /// @param build The build number of the already existing plugin setup.
    /// @param pluginSetup The plugin setup contract address.
    error PluginSetupAlreadyInPreviousRelease(uint8 release, uint16 build, address pluginSetup);

    /// @notice Thrown if the metadata URI is empty.
    error EmptyReleaseMetadata();

    /// @notice Thrown if release does not exist.
    error ReleaseDoesNotExist();
    /// @notice Thrown if an upgrade is not supported from a specific protocol version .
    error ProtocolVersionUpgradeNotSupported(uint8[3] protocolVersion);
    /// @notice Thrown if the plugin repo is already initialized.
    error PluginRepoAlreadyInitialized();

    /// @dev Used to disallow initializing the implementation contract by an attacker for extra safety.
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract by
    /// - initializing the permission manager
    /// - granting the `MAINTAINER_PERMISSION_ID` permission to the initial owner.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    function initialize(address initialOwner) external initializer {
        __PermissionManager_init(initialOwner);

        _grant(address(this), initialOwner, MAINTAINER_PERMISSION_ID);
        _grant(address(this), initialOwner, UPGRADE_REPO_PERMISSION_ID);
    }

    /// @notice Initializes the pluginRepo after an upgrade from a previous protocol version.
    /// @param _previousProtocolVersion The semantic protocol version number of the previous DAO implementation contract this upgrade is transitioning from.
    /// @param _initData The initialization data to be passed to via `upgradeToAndCall` (see [ERC-1967](https://docs.openzeppelin.com/contracts/4.x/api/proxy#ERC1967Upgrade)).
    /// @dev This function is a placeholder until we require reinitialization.
    function initializeFrom(
        uint8[3] calldata _previousProtocolVersion,
        bytes calldata _initData
    ) external reinitializer(2) {
        // Silences the unused function parameter warning.
        _previousProtocolVersion;
        _initData;

        // Revert because this is a placeholder until this contract requires reinitialization.
        revert();
    }

    /// @inheritdoc IPluginRepo
    function createVersion(
        uint8 _release,
        address _pluginSetup,
        bytes calldata _buildMetadata,
        bytes calldata _releaseMetadata
    ) external auth(MAINTAINER_PERMISSION_ID) {
        if (!_pluginSetup.supportsInterface(type(IPluginSetup).interfaceId)) {
            revert InvalidPluginSetupInterface();
        }

        if (_release == 0) {
            revert ReleaseZeroNotAllowed();
        }

        // Check that the release number is not incremented by more than one
        if (_release - latestRelease > 1) {
            revert InvalidReleaseIncrement({latestRelease: latestRelease, newRelease: _release});
        }

        if (_release > latestRelease) {
            latestRelease = _release;

            if (_releaseMetadata.length == 0) {
                revert EmptyReleaseMetadata();
            }
        }

        // Make sure the same plugin setup wasn't used in previous releases.
        Version storage version = versions[latestTagHashForPluginSetup[_pluginSetup]];
        if (version.tag.release != 0 && version.tag.release != _release) {
            revert PluginSetupAlreadyInPreviousRelease(
                version.tag.release,
                version.tag.build,
                _pluginSetup
            );
        }

        uint16 build = ++buildsPerRelease[_release];

        updateVersionMappings(_release, build, _pluginSetup, _buildMetadata, _releaseMetadata);
    }

    /// @inheritdoc IPluginRepo
    function createInitialVersion(
        uint8 _release,
        uint16 _build,
        address _pluginSetup,
        bytes calldata _buildMetadata,
        bytes calldata _releaseMetadata
    ) external auth(MAINTAINER_PERMISSION_ID) {
        if (!_pluginSetup.supportsInterface(type(IPluginSetup).interfaceId)) {
            revert InvalidPluginSetupInterface();
        }
        // This method can only be called if no prior versions exist
        if (latestRelease != 0) {
            revert PluginRepoAlreadyInitialized();
        }
        // Release should not be 0
        if (_release == 0) {
            revert ReleaseZeroNotAllowed();
        }
        // Check that the release metadata is not empty
        if (_releaseMetadata.length == 0) {
            revert EmptyReleaseMetadata();
        }

        latestRelease = _release;
        buildsPerRelease[_release] = _build;

        updateVersionMappings(_release, _build, _pluginSetup, _buildMetadata, _releaseMetadata);
    }

    /// @inheritdoc IPluginRepo
    function updateReleaseMetadata(
        uint8 _release,
        bytes calldata _releaseMetadata
    ) external auth(MAINTAINER_PERMISSION_ID) {
        if (_release == 0) {
            revert ReleaseZeroNotAllowed();
        }

        if (_release > latestRelease) {
            revert ReleaseDoesNotExist();
        }

        if (_releaseMetadata.length == 0) {
            revert EmptyReleaseMetadata();
        }

        emit ReleaseMetadataUpdated(_release, _releaseMetadata);
    }

    /// @inheritdoc IPluginRepo
    function getLatestVersion(uint8 _release) external view returns (Version memory) {
        uint16 latestBuild = uint16(buildsPerRelease[_release]);
        return getVersion(tagHash(Tag(_release, latestBuild)));
    }

    /// @inheritdoc IPluginRepo
    function getLatestVersion(address _pluginSetup) external view returns (Version memory) {
        return getVersion(latestTagHashForPluginSetup[_pluginSetup]);
    }

    /// @inheritdoc IPluginRepo
    function getVersion(Tag calldata _tag) external view returns (Version memory) {
        return getVersion(tagHash(_tag));
    }

    /// @inheritdoc IPluginRepo
    function getVersion(bytes32 _tagHash) public view returns (Version memory) {
        Version storage version = versions[_tagHash];

        if (version.tag.release == 0) {
            revert VersionHashDoesNotExist(_tagHash);
        }

        return version;
    }

    /// @inheritdoc IPluginRepo
    function buildCount(uint8 _release) external view returns (uint256) {
        return buildsPerRelease[_release];
    }

    /// @notice Internal method for updating the version mappings.
    /// @param _release The release number.
    /// @param _build The build number.
    /// @param _pluginSetup The address of the plugin setup contract.
    /// @param _buildMetadata The build metadata URI.
    /// @param _releaseMetadata The release metadata URI.
    function updateVersionMappings(
        uint8 _release,
        uint16 _build,
        address _pluginSetup,
        bytes calldata _buildMetadata,
        bytes calldata _releaseMetadata
    ) internal {
        Tag memory tag = Tag(_release, _build);
        bytes32 _tagHash = tagHash(tag);

        versions[_tagHash] = Version(tag, _pluginSetup, _buildMetadata);

        latestTagHashForPluginSetup[_pluginSetup] = _tagHash;

        emit VersionCreated({
            release: _release,
            build: _build,
            pluginSetup: _pluginSetup,
            buildMetadata: _buildMetadata
        });

        if (_releaseMetadata.length > 0) {
            emit ReleaseMetadataUpdated({release: _release, releaseMetadata: _releaseMetadata});
        }
    }

    /// @notice The hash of the version tag obtained from the packed, bytes-encoded release and build number.
    /// @param _tag The version tag.
    /// @return The version tag hash.
    function tagHash(Tag memory _tag) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_tag.release, _tag.build));
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_REPO_PERMISSION_ID` permission.
    function _authorizeUpgrade(
        address
    ) internal virtual override auth(UPGRADE_REPO_PERMISSION_ID) {}

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == type(IPluginRepo).interfaceId ||
            _interfaceId == type(IProtocolVersion).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZeppelin's guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[46] private __gap;
}
