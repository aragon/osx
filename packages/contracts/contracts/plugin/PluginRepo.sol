/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../core/permission/PermissionManager.sol";
import "../core/erc165/AdaptiveERC165.sol";
import "../utils/UncheckedMath.sol";
import "./PluginFactoryBase.sol";
import "./IPluginRepo.sol";

/// @title PluginRepo
/// @author Aragon Association - 2020 - 2022
/// @notice The repository contract required for managing and publishing different plugin versions within the Aragon DAO framework following the [Semantic Versioning 2.0.0](https://semver.org/) convention.
contract PluginRepo is
    IPluginRepo,
    Initializable,
    UUPSUpgradeable,
    PermissionManager,
    AdaptiveERC165
{
    struct Version {
        uint16[3] semanticVersion;
        address pluginFactory;
        bytes contentURI;
    }

    /// @notice The ID of the permission required to call the `createVersion` function.
    bytes32 public constant CREATE_VERSION_PERMISSION_ID = keccak256("CREATE_VERSION_PERMISSION");

    /// @notice The ID of the permission required to call the `createVersion` function.
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    /// @notice The index of the next version to be created.
    uint256 internal nextVersionIndex;

    /// @notice The mapping between version indices and version information.
    mapping(uint256 => Version) internal versions;

    /// @notice A mapping between the semantic version number hash and the version index.
    mapping(bytes32 => uint256) internal versionIndexForSemantic;

    /// @notice A mapping between the `PluginFactory` contract addresses and the version index.
    mapping(address => uint256) internal versionIndexForPluginFactory;

    /// @notice Thrown if a semantic version number bump is invalid.
    /// @param currentVersion The current semantic version number.
    /// @param nextVersion The next semantic version number.
    error InvalidBump(uint16[3] currentVersion, uint16[3] nextVersion);

    /// @notice Thrown if version does not exist.
    /// @param versionIndex The index of the version.
    error VersionIndexDoesNotExist(uint256 versionIndex);

    /// @notice Thrown if a contract does not inherit from `PluginFactoryBase`.
    /// @param invalidPluginFactory The address of the contract missing the `PluginFactoryBase` interface.
    error InvalidPluginFactoryInterface(address invalidPluginFactory);

    /// @notice Thrown if a contract is not a `PluginFactory` contract.
    /// @param invalidPluginFactory The address of the contract not being a plugin factory.
    error InvalidPluginFactoryContract(address invalidPluginFactory);

    /// @notice Thrown if address is not a contract.
    /// @param invalidContract The address not being a contract.
    error InvalidContractAddress(address invalidContract);

    /// @notice Emitted when a new version is created.
    /// @param versionId The version index.
    /// @param semanticVersion The semantic version number.
    event VersionCreated(uint256 versionId, uint16[3] semanticVersion);

    /// @notice Initializes the contract by
    /// - registering the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID
    /// - initializing the permission manager
    /// - setting the next version index to 1 and
    /// - giving the `CREATE_VERSION_PERMISSION_ID` permission to the initial owner.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    function initialize(address initialOwner) external initializer {
        _registerStandard(type(IPluginRepo).interfaceId);
        __PermissionManager_init(initialOwner);

        nextVersionIndex = 1;

        // set permissionIds.
        _grant(address(this), initialOwner, CREATE_VERSION_PERMISSION_ID);
    }

    /// @inheritdoc IPluginRepo
    function createVersion(
        uint16[3] memory _newSemanticVersion,
        address _pluginFactory,
        bytes calldata _contentURI
    ) external auth(address(this), CREATE_VERSION_PERMISSION_ID) {
        // Check if `_pluginFactory` is a `PluginFactoryBase` contract
        if (!Address.isContract(_pluginFactory)) {
            revert InvalidContractAddress({invalidContract: _pluginFactory});
        }

        try
            PluginFactoryBase(_pluginFactory).supportsInterface(
                PluginFactoryIDs.PLUGIN_FACTORY_INTERFACE_ID
            )
        returns (bool result) {
            if (!result) {
                revert InvalidPluginFactoryInterface({invalidPluginFactory: _pluginFactory});
            }
        } catch {
            revert InvalidPluginFactoryContract({invalidPluginFactory: _pluginFactory});
        }

        uint256 currentVersionIndex = nextVersionIndex - 1;

        uint16[3] memory currentSematicVersion;

        if (currentVersionIndex > 0) {
            Version memory currentVersion = versions[currentVersionIndex];
            currentSematicVersion = currentVersion.semanticVersion;
        }

        if (!isValidBump(currentSematicVersion, _newSemanticVersion)) {
            revert InvalidBump({
                currentVersion: currentSematicVersion,
                nextVersion: _newSemanticVersion
            });
        }

        uint256 versionIndex = nextVersionIndex;
        nextVersionIndex = _uncheckedIncrement(nextVersionIndex);
        versions[versionIndex] = Version(_newSemanticVersion, _pluginFactory, _contentURI);
        versionIndexForSemantic[semanticVersionHash(_newSemanticVersion)] = versionIndex;
        versionIndexForPluginFactory[_pluginFactory] = versionIndex;

        emit VersionCreated(versionIndex, _newSemanticVersion);
    }

    /// @notice Gets the version information of the latest version.
    /// @return semanticVersion The semantic version number.
    /// @return pluginFactory The address of the plugin factory associated with the version.
    /// @return contentURI The external URI pointing to the content of the version.
    function getLatestVersion()
        public
        view
        returns (
            uint16[3] memory semanticVersion,
            address pluginFactory,
            bytes memory contentURI
        )
    {
        return getVersionById(nextVersionIndex - 1);
    }

    /// @notice Gets the version information associated with a plugin factory address.
    /// @return semanticVersion The semantic version number.
    /// @return pluginFactory The address of the plugin factory associated with the version.
    /// @return contentURI The external URI pointing to the content of the version.
    function getVersionByPluginFactory(address _pluginFactory)
        public
        view
        returns (
            uint16[3] memory semanticVersion,
            address pluginFactory,
            bytes memory contentURI
        )
    {
        return getVersionById(versionIndexForPluginFactory[_pluginFactory]);
    }

    /// @notice Gets the version information associated with a semantic version number.
    /// @return semanticVersion The semantic version number.
    /// @return pluginFactory The address of the plugin factory associated with the version.
    /// @return contentURI The external URI pointing to the content of the version.
    function getVersionBySemanticVersion(uint16[3] memory _semanticVersion)
        public
        view
        returns (
            uint16[3] memory semanticVersion,
            address pluginFactory,
            bytes memory contentURI
        )
    {
        return getVersionById(versionIndexForSemantic[semanticVersionHash(_semanticVersion)]);
    }

    /// @notice Gets the version information associated with a version index.
    /// @return semanticVersion The semantic version number.
    /// @return pluginFactory The address of the plugin factory associated with the version.
    /// @return contentURI The external URI pointing to the content of the version.
    function getVersionById(uint256 _versionIndex)
        public
        view
        returns (
            uint16[3] memory semanticVersion,
            address pluginFactory,
            bytes memory contentURI
        )
    {
        if (_versionIndex <= 0 || _versionIndex >= nextVersionIndex)
            revert VersionIndexDoesNotExist({versionIndex: _versionIndex});
        Version storage version = versions[_versionIndex];
        return (version.semanticVersion, version.pluginFactory, version.contentURI);
    }

    /// @notice Gets the total number of published versions.
    /// @return uint256 The number of published versions.
    function getVersionCount() public view returns (uint256) {
        return nextVersionIndex - 1;
    }

    /// @notice Checks if a version bump is valid.
    /// @param _oldVersion The old semantic version number.
    /// @param _newVersion The new semantic version number.
    /// @return bool True if the bump is valid.
    function isValidBump(uint16[3] memory _oldVersion, uint16[3] memory _newVersion)
        public
        pure
        returns (bool)
    {
        bool hasBumped;
        uint256 i = 0;
        while (i < 3) {
            if (hasBumped) {
                if (_newVersion[i] != 0) {
                    return false;
                }
            } else if (_newVersion[i] != _oldVersion[i]) {
                if (_oldVersion[i] > _newVersion[i] || _newVersion[i] - _oldVersion[i] != 1) {
                    return false;
                }
                hasBumped = true;
            }
            i = _uncheckedIncrement(i);
        }
        return hasBumped;
    }

    /// @notice Generates a hash from a semantic version number.
    /// @param semanticVersion The semantic version number.
    /// @return bytes32 The hash of the semantic version number.
    function semanticVersionHash(uint16[3] memory semanticVersion) internal pure returns (bytes32) {
        return
            keccak256(abi.encodePacked(semanticVersion[0], semanticVersion[1], semanticVersion[2]));
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_PERMISSION_ID` permission.
    function _authorizeUpgrade(address)
        internal
        virtual
        override
        auth(address(this), UPGRADE_PERMISSION_ID)
    {}
}
