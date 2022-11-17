// SPDX-License-Identifier:    MIT

pragma solidity 0.8.10;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {PermissionManager} from "../core/permission/PermissionManager.sol";
import {_uncheckedIncrement} from "../utils/UncheckedMath.sol";
import {PluginSetup} from "./PluginSetup.sol";
import {IPluginSetup} from "./PluginSetup.sol";
import {IPluginRepo} from "./IPluginRepo.sol";
import {isValidBumpStrict, BumpInvalid} from "./SemanticVersioning.sol";

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
    using Address for address;
    
    struct Version {
        uint8 releaseId;
        uint16 buildId;
        address pluginSetup;
        bool verified;
        bytes contentURI;
    }

    /// @notice The ID of the permission required to call the `createVersion` function.
    bytes32 public constant CREATE_VERSION_PERMISSION_ID = keccak256("CREATE_VERSION_PERMISSION");

    /// @notice The ID of the permission required to call the `createVersion` function.
    bytes32 public constant UPGRADE_REPO_PERMISSION_ID = keccak256("UPGRADE_REPO_PERMISSION");

    /// @notice Current latest release id(there can be maximum uint8 = 255 possibility).
    uint256 public latestReleaseId;

    /// @notice increasing build ids per release
    /// @dev keys can only be uint8 even though uint256 is specified to reduce gas cost.
    mapping(uint256 => uint256) internal buildIdsPerRelease;

    /// @notice The mapping between version hash and its corresponding Version information.
    /// @dev key: keccak(abi.encode(releaseId, buildId)) value: Version struct.
    mapping(bytes32 => Version) internal versions;

    /// @notice The mapping between plugin setup address and its corresponding versionHash
    mapping(address => bytes32) internal latestVersionHashForPluginSetup;

    /// @notice Thrown if version does not exist.
    /// @param versionHash The version Hash(releaseId + buildId)
    error VersionHashDoesNotExist(bytes32 versionHash);

    /// @notice Thrown if a contract does not inherit from `PluginSetup`.
    /// @param invalidPluginSetup The address of the contract missing the `PluginSetup` interface.
    error InvalidPluginSetupInterface(address invalidPluginSetup);

    /// @notice Thrown if a contract is not a `PluginSetup` contract.
    /// @param invalidPluginSetup The address of the contract not being a plugin factory.
    error InvalidPluginSetupContract(address invalidPluginSetup);

    /// @notice Thrown if address is not a contract.
    /// @param invalidContract The address not being a contract.
    error InvalidContractAddress(address invalidContract);

    /// @notice Thrown if release id is 0.
    error ReleaseIdNull();

    /// @notice Thrown if release id is by more than 1 to the previous release id.
    /// @param currentReleaseId the current latest release id.
    /// @param newReleaseId new release id dev is trying to push.
    error ReleaseIdTooBig(uint256 currentReleaseId, uint256 newReleaseId);

    /// @notice Thrown if the same plugin setup exists in previous releases.
    /// @param releaseId the release id in which pluginSetup is found.
    /// @param buildId the build id of the release id in which pluginSetup is found.
    /// @param pluginSetup the plugin setup address.
    error PluginSetupExistsInAnotherRelease(
        uint8 releaseId,
        uint16 buildId,
        address pluginSetup
    );

    /// @notice Thrown if the same plugin setup exists in previous releases.
    /// @param releaseId the release id
    /// @param buildId the build id
    /// @param pluginSetup The address of the plugin setup contract.
    /// @param contentURI External URI where the plugin metadata and subsequent resources can be fetched from
    /// @param pluginSetup the plugin setup address.
    event VersionCreated(
        uint8 releaseId,
        uint16 buildId,
        address indexed pluginSetup,
        bytes contentURI,
        bool verified
    );

    /// @notice Initializes the contract by
    /// - registering the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID
    /// - initializing the permission manager
    /// - setting the next version index to 1 and
    /// - giving the `CREATE_VERSION_PERMISSION_ID` permission to the initial owner.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    function initialize(address initialOwner) external initializer {
        __PermissionManager_init(initialOwner);

        // set permissionIds.
        _grant(address(this), initialOwner, CREATE_VERSION_PERMISSION_ID);
    }

    // How it looks:
    // Release 1
    // //  1 => {
    //         pluginSetup: 0x12  (implementation: 0x55)
    //         contentURI: cid12
    // //  },
    // //  2 => {
    //         pluginSetup: 0x34 (implementation: 0x77)
    //         contentURI: cid12
    // //  },
    // //  3 => {
    //         pluginSetup: 0x56 (implementation: 0x88)
    //         contentURI: cid12
    // //  },
    // //  4 => {
    //         pluginSetup: 0x56 (implementation: 0x88)
    //         contentURI: cid34
    // //  }
    // Release 2
    // //  1 => {
    //         pluginSetup: 0x44  (implementation: 0x11)
    //         contentURI: cid12
    // //  },
    // //  2 => {
    //         pluginSetup: 0x66  (implementation: 0x22)
    //         contentURI: cid12
    // //  },

    /// @inheritdoc IPluginRepo
    function createVersion(
        uint8 _releaseId,
        address _pluginSetup,
        bytes calldata _contentURI
    ) external auth(address(this), CREATE_VERSION_PERMISSION_ID) {
        // In a case where _pluginSetup doesn't contain supportsInterface,
        // but contains fallback, that doesn't return anything(most cases)
        // the below approach aims to still return custom error which not possible with try/catch..
        // NOTE: also checks if _pluginSetup is a contract and reverts if not.
        bytes memory data = _pluginSetup.functionCall(
            abi.encodeWithSelector(
                ERC165.supportsInterface.selector,
                type(IPluginSetup).interfaceId
            )
        );

        // NOTE: if data contains 32 bytes that can't be decoded with uint256
        // it reverts with solidity's ambigious error.
        if (data.length != 32 || abi.decode(data, (uint256)) != 1) {
            revert InvalidPluginSetupInterface({invalidPluginSetup: _pluginSetup});
        }

        if (_releaseId == 0) {
            revert ReleaseIdNull();
        }

        // Can't release 3 unless 2 is released.
        if (_releaseId - latestReleaseId > 1) {
            revert ReleaseIdTooBig(latestReleaseId, _releaseId);
        }

        if (_releaseId > latestReleaseId) {
            latestReleaseId = _releaseId;
        }

        // Make sure the same plugin setup doesn't exist in previous relase.
        Version storage version = versions[latestVersionHashForPluginSetup[_pluginSetup]];
        if (version.releaseId != 0 && _releaseId != version.releaseId) {
            revert PluginSetupExistsInAnotherRelease(
                version.releaseId,
                version.buildId,
                _pluginSetup
            );
        }

        uint16 nextVersionId;
        unchecked {
            nextVersionId = uint16(buildIdsPerRelease[_releaseId]++);
        }

        bytes32 _versionHash = versionHash(_releaseId, nextVersionId);

        versions[_versionHash] = Version(
            _releaseId,
            nextVersionId,
            _pluginSetup,
            false,
            _contentURI
        );

        latestVersionHashForPluginSetup[_pluginSetup] = _versionHash;

        emit VersionCreated(_releaseId, nextVersionId, _pluginSetup, _contentURI, false);
    }

    /// @notice get the latest version in the `_releaseId`.
    /// @param _releaseId the release id
    /// @return Version the latest version which is returned from the _releaseId's build sequence.
    function latestVersionPerRelease(uint8 _releaseId) public view returns (Version memory) {
        uint16 latestBuildId = uint16(buildIdsPerRelease[_releaseId]);
        return versionByVersionHash(versionHash(_releaseId, latestBuildId));
    }

    /// @notice get the latest version by plugin setup.
    /// @param _pluginSetup the plugin setup address
    /// @return Version the version that is binded to the _pluginSetup
    function latestVersionByPluginSetup(address _pluginSetup) public view returns (Version memory) {
        return versionByVersionHash(latestVersionHashForPluginSetup[_pluginSetup]);
    }

    /// @notice get the version by release id and build id.
    /// @param _releaseId the release id
    /// @param _buildId the build id in _releaseId
    /// @return Version the version which is binded to the hash of (_releaseId, _buildId)
    function versionByReleaseAndBuildId(uint8 _releaseId, uint16 _buildId)
        public
        view
        returns (Version memory)
    {
        return versionByVersionHash(versionHash(_releaseId, _buildId));
    }

    /// @notice get the concrete version.
    /// @param _releaseAndVersionHash the version hash of release Id and buildId.
    /// @return Version the concrete version by the exact hash.
    function versionByVersionHash(bytes32 _releaseAndVersionHash)
        public
        view
        returns (Version memory)
    {
        Version storage version = versions[_releaseAndVersionHash];

        if (version.releaseId == 0) {
            revert VersionHashDoesNotExist(_releaseAndVersionHash);
        }

        return version;
    }

    /// @notice Gets the total number of published versions.
    /// @param _releaseId release id.
    /// @return The number of published versions.
    function getVersionCountPerRelease(uint8 _releaseId) public view returns (uint256) {
        return buildIdsPerRelease[_releaseId];
    }
    
    /// @notice get the version hash.
    /// @param _releaseId the release id
    /// @param _buildId the build id in _releaseId
    /// @return bytes32 the keccak hash of abi encoded _releaseId and _buildId
    function versionHash(uint8 _releaseId, uint16 _buildId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_releaseId, _buildId));
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_REPO_PERMISSION_ID` permission.
    function _authorizeUpgrade(address)
        internal
        virtual
        override
        auth(address(this), UPGRADE_REPO_PERMISSION_ID)
    {}

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IPluginRepo).interfaceId ||
            interfaceId == type(UUPSUpgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
