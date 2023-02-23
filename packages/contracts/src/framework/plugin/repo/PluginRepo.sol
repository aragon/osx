// SPDX-License-Identifier:    AGPL-3.0-or-later

pragma solidity 0.8.17;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {PermissionManager} from "../../../core/permission/PermissionManager.sol";
import {PluginSetup} from "../setup/PluginSetup.sol";
import {IPluginSetup} from "../setup/PluginSetup.sol";
import {IPluginRepo} from "./IPluginRepo.sol";

/// @title PluginRepo
/// @author Aragon Association - 2020 - 2023
/// @notice The plugin repository contract required for managing and publishing different plugin versions within the Aragon DAO framework.
contract PluginRepo is
    Initializable,
    ERC165Upgradeable,
    IPluginRepo,
    UUPSUpgradeable,
    PermissionManager
{
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;

    /// @notice The struct describing the tag of a version obtained by a release and build number as `RELEASE.BUILD`.
    /// @param release The release number.
    /// @param build The build number
    /// @dev Releases can include a storage layout or the addition of new functions. Builds include logic changes or updates of the UI.
    struct Tag {
        uint8 release;
        uint16 build;
    }

    /// @notice The struct describing a plugin version (release and build).
    /// @param tag The version tag.
    /// @param pluginSetup The setup contract associated with this version.
    /// @param buildMetadata The build metadata URI.
    struct Version {
        Tag tag;
        address pluginSetup;
        bytes buildMetadata;
    }

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

    /// @notice Thrown if the same plugin setup exists in previous releases.
    /// @param release The release number.
    /// @param build The build number.
    /// @param pluginSetup The address of the plugin setup contract.
    /// @param buildMetadata The build metadata URI.
    event VersionCreated(
        uint8 release,
        uint16 build,
        address indexed pluginSetup,
        bytes buildMetadata
    );

    /// @notice Thrown when a release's metadata was updated.
    /// @param release The release number.
    /// @param releaseMetadata The release metadata URI.
    event ReleaseMetadataUpdated(uint8 release, bytes releaseMetadata);

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

        Tag memory tag = Tag(_release, build);
        bytes32 _tagHash = tagHash(tag);

        versions[_tagHash] = Version(tag, _pluginSetup, _buildMetadata);

        latestTagHashForPluginSetup[_pluginSetup] = _tagHash;

        emit VersionCreated({
            release: _release,
            build: build,
            pluginSetup: _pluginSetup,
            buildMetadata: _buildMetadata
        });

        if (_releaseMetadata.length > 0) {
            emit ReleaseMetadataUpdated(_release, _releaseMetadata);
        }
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

    /// @notice Returns the latest version for a given release number.
    /// @param _release The release number.
    /// @return The latest version of this release.
    function getLatestVersion(uint8 _release) public view returns (Version memory) {
        uint16 latestBuild = uint16(buildsPerRelease[_release]);
        return getVersion(tagHash(Tag(_release, latestBuild)));
    }

    /// @notice Returns the latest version for a given plugin setup.
    /// @param _pluginSetup The plugin setup address
    /// @return The latest version associated with the plugin Setup.
    function getLatestVersion(address _pluginSetup) public view returns (Version memory) {
        return getVersion(latestTagHashForPluginSetup[_pluginSetup]);
    }

    /// @notice Returns the version associated with a tag.
    /// @param _tag The version tag.
    /// @return The version associated with the tag.
    function getVersion(Tag calldata _tag) public view returns (Version memory) {
        return getVersion(tagHash(_tag));
    }

    /// @notice Returns the version for a tag hash.
    /// @param _tagHash The tag hash.
    /// @return The version associated with a tag hash.
    function getVersion(bytes32 _tagHash) public view returns (Version memory) {
        Version storage version = versions[_tagHash];

        if (version.tag.release == 0) {
            revert VersionHashDoesNotExist(_tagHash);
        }

        return version;
    }

    /// @notice Gets the total number of builds for a given release number.
    /// @param _release The release number.
    /// @return The number of builds of this release.
    function buildCount(uint8 _release) public view returns (uint256) {
        return buildsPerRelease[_release];
    }

    /// @notice The hash of the version tag obtained from the packed, bytes-encoded release and build number.
    /// @param _tag The version tag.
    /// @return The version tag hash.
    function tagHash(Tag memory _tag) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_tag.release, _tag.build));
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
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
            _interfaceId == type(UUPSUpgradeable).interfaceId ||
            super.supportsInterface(_interfaceId);
    }
}
