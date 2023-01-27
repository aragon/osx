// SPDX-License-Identifier:    MIT

pragma solidity 0.8.10;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import {PermissionManager} from "../core/permission/PermissionManager.sol";
import {PluginSetup} from "./PluginSetup.sol";
import {IPluginSetup} from "./PluginSetup.sol";
import {IPluginRepo} from "./IPluginRepo.sol";

/// @title PluginRepo
/// @author Aragon Association - 2020 - 2022
/// @notice The plugin repository contract required for managing and publishing different plugin versions within the Aragon DAO framework following the [Semantic Versioning 2.0.0](https://semver.org/) convention.
//TODO Rename to PluginSetupRepo?
contract PluginRepo is
    Initializable,
    ERC165Upgradeable,
    IPluginRepo,
    UUPSUpgradeable,
    PermissionManager
{
    using AddressUpgradeable for address;

    struct Tag {
        uint8 release;
        uint16 build;
    }

    struct Version {
        Tag tag;
        address pluginSetup;
        bytes buildMetadata;
    }

    /// @notice The ID of the permission required to call the `createVersion` function.
    bytes32 public constant MAINTAINER_PERMISSION_ID = keccak256("MAINTAINER_PERMISSION");

    /// @notice The ID of the permission required to call the `createVersion` function.
    bytes32 public constant UPGRADE_REPO_PERMISSION_ID = keccak256("UPGRADE_REPO_PERMISSION");

    /// @notice increasing build numbers per release
    mapping(uint8 => uint16) internal buildsPerRelease;

    /// @notice The mapping between version hash and its corresponding Version information.
    /// @dev key: keccak(abi.encode(release, build)) value: Version struct.
    mapping(bytes32 => Version) internal versions;

    /// @notice The mapping between plugin setup address and its corresponding versionHash
    mapping(address => bytes32) internal latestTagHashForPluginSetup;

    /// @notice The mapping between release id and release's metadata URI.
    mapping(uint8 => bytes) internal metadataPerRelease;

    /// @notice The ID of the latest release.
    /// @dev The maximum release ID is 255.
    uint8 public latestRelease;

    /// @notice Thrown if version does not exist.
    /// @param versionHash The version Hash(release + build)
    error VersionHashDoesNotExist(bytes32 versionHash);

    /// @notice Thrown if a contract does not inherit from `PluginSetup`.
    /// @param invalidPluginSetup The address of the contract missing the `PluginSetup` interface.
    error InvalidPluginSetupInterface(address invalidPluginSetup);

    /// @notice Thrown if release is 0.
    error ReleaseZeroNotAllowed();

    /// @notice Thrown if release id is by more than 1 to the previous release id.
    /// @param latestRelease the current latest release id.
    /// @param newRelease new release id dev is trying to push.
    error ReleaseIncrementInvalid(uint8 latestRelease, uint8 newRelease);

    /// @notice Thrown if the same plugin setup exists in previous releases.
    /// @param release the release number in which pluginSetup is found.
    /// @param build the build number of the release number in which pluginSetup is found.
    /// @param pluginSetup the plugin setup address.
    error PluginSetupAlreadyInPreviousRelease(uint8 release, uint16 build, address pluginSetup);

    /// @notice Thrown if metadata is not set for release.
    /// @param release the release number in which pluginSetup is found.
    /// @param metadata External URI where the plugin's release metadata and subsequent resources can be fetched from.
    error InvalidReleaseMetadata(uint8 release, bytes metadata);

    /// @notice Thrown if release does not exist.
    /// @param release the release number in which pluginSetup is found.
    error ReleaseDoesNotExist(uint8 release);

    /// @notice Thrown if the same plugin setup exists in previous releases.
    /// @param release the release number.
    /// @param build the build number.
    /// @param pluginSetup The address of the plugin setup contract.
    /// @param metadata External URI where the plugin metadata and subsequent resources can be fetched from.
    event VersionCreated(uint8 release, uint16 build, address indexed pluginSetup, bytes metadata);

    /// @notice Thrown when a release's metadata was updated.
    /// @param release the release number.
    /// @param metadata External URI where the plugin's release metadata and subsequent resources can be fetched from.
    event ReleaseMetadataUpdated(uint8 release, bytes metadata);

    /// @dev Used to disallow initializing the implementation contract by an attacker for extra safety.
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract by
    /// - registering the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID
    /// - initializing the permission manager
    /// - setting the next version index to 1 and
    /// - giving the `MAINTAINER_PERMISSION_ID` permission to the initial owner.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    function initialize(address initialOwner) external initializer {
        __PermissionManager_init(initialOwner);

        // set permissionIds.
        _grant(address(this), initialOwner, MAINTAINER_PERMISSION_ID);
    }

    /// @inheritdoc IPluginRepo
    function createVersion(
        uint8 _release,
        address _pluginSetup,
        bytes calldata _buildMetadata,
        bytes calldata _releaseMetadata
    ) external auth(address(this), MAINTAINER_PERMISSION_ID) {
        // In a case where _pluginSetup doesn't contain supportsInterface,
        // but contains fallback, that doesn't return anything(most cases)
        // the below approach aims to still return custom error which not possible with try/catch..
        // NOTE: also checks if _pluginSetup is a contract and reverts if not.
        bytes memory data = _pluginSetup.functionCall(
            abi.encodeWithSelector(
                ERC165Upgradeable.supportsInterface.selector,
                type(IPluginSetup).interfaceId
            )
        );

        // NOTE: if data contains 32 bytes that can't be decoded with uint256
        // it reverts with solidity's ambigious error.
        if (data.length != 32 || abi.decode(data, (uint256)) != 1) {
            revert InvalidPluginSetupInterface({invalidPluginSetup: _pluginSetup});
        }

        if (_release == 0) {
            revert ReleaseZeroNotAllowed();
        }

        // Can't release `x` unless `x-1` is released.
        if (_release - latestRelease > 1) {
            revert ReleaseIncrementInvalid({latestRelease: latestRelease, newRelease: _release});
        }

        if (_release > latestRelease) {
            latestRelease = _release;

            if (_releaseMetadata.length == 0) {
                revert ReleaseMetadataInvalid({release: _release, metadata: _releaseMetadata});
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

        emit VersionCreated(_release, build, _pluginSetup, _buildMetadata);

        if (_releaseMetadata.length > 0) {
            _updateReleaseMetadata(_release, _releaseMetadata);
        }
    }

    /// @inheritdoc IPluginRepo
    function updateReleaseMetadata(
        uint8 _release,
        bytes calldata _metadata
    ) external auth(address(this), MAINTAINER_PERMISSION_ID) {
        if (_release == 0) {
            revert ReleaseZeroNotAllowed();
        }

        if (_release > latestRelease) {
            revert ReleaseDoesNotExist({release: _release});
        }

        if (_metadata.length == 0) {
            revert ReleaseMetadataInvalid({release: _release, metadata: _metadata});
        }

        _updateReleaseMetadata(_release, _metadata);
    }

    /// @notice The private helper function to replace new `_metadata` for the `_release`.
    /// @param _release The release number.
    /// @param _metadata External URI where the plugin's release metadata and subsequent resources can be fetched from.
    function _updateReleaseMetadata(uint8 _release, bytes calldata _metadata) internal {
        metadataPerRelease[_release] = _metadata;

        emit ReleaseMetadataUpdated(_release, _metadata);
    }

    /// @notice latest version in the release number.
    /// @param _release the release number.
    /// @return Version the latest version in the release number.
    function getLatestVersion(uint8 _release) public view returns (Version memory) {
        uint16 latestBuild = uint16(buildsPerRelease[_release]);
        return getVersion(tagHash(Tag(_release, latestBuild)));
    }

    /// @notice get the latest version by plugin setup.
    /// @param _pluginSetup the plugin setup address
    /// @return Version latest version that is bound to the _pluginSetup
    function getLatestVersion(address _pluginSetup) public view returns (Version memory) {
        return getVersion(latestTagHashForPluginSetup[_pluginSetup]);
    }

    /// @notice get the version by tag.
    /// @param _tag the version tag.
    /// @return the version which belongs to the _tag.
    function getVersion(Tag calldata _tag) public view returns (Version memory) {
        return getVersion(tagHash(_tag));
    }

    /// @notice get the concrete version.
    /// @param _tagHash the tag hash.
    /// @return Version the concrete version by the exact hash.
    function getVersion(bytes32 _tagHash) public view returns (Version memory) {
        Version storage version = versions[_tagHash];

        if (version.tag.release == 0) {
            revert VersionHashDoesNotExist(_tagHash);
        }

        return version;
    }

    /// @notice Gets the total number of published versions per release.
    /// @param _release release id.
    /// @return The number of published versions in the release.
    function buildCount(uint8 _release) public view returns (uint256) {
        return buildsPerRelease[_release];
    }

    /// @notice get the tag hash.
    /// @param _tag the tag.
    /// @return bytes32 the keccak hash of abi encoded _release and _build
    function tagHash(Tag memory _tag) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_tag.release, _tag.build));
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_REPO_PERMISSION_ID` permission.
    function _authorizeUpgrade(
        address
    ) internal virtual override auth(address(this), UPGRADE_REPO_PERMISSION_ID) {}

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param interfaceId The ID of the interface.
    /// @return bool Returns `true` if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IPluginRepo).interfaceId ||
            interfaceId == type(UUPSUpgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
