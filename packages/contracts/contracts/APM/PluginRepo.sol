/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../core/acl/ACL.sol";
import "../core/erc165/AdaptiveERC165.sol";
import "../APM/IPluginFactory.sol";
import "./IPluginRepo.sol";

/// @title The repository contract required for managing and publishing different version of a plugin within the Aragon DAO framework
/// @author Aragon Association - 2020 - 2022
contract PluginRepo is IPluginRepo, Initializable, UUPSUpgradeable, ACL, AdaptiveERC165 {
    bytes32 public constant CREATE_VERSION_ROLE = keccak256("CREATE_VERSION_ROLE");
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");

    /// @notice Thrown version bump is invalid
    error InvalidBump();

    /// @notice Thrown if version is invalid
    error InvalidVersion();

    /// @notice Thrown if version does not exist
    error VersionDoesNotExist();

    /// @notice Thrown if contract does not have IPluginFactory interface
    error InvalidPluginInterface();

    /// @notice Thrown if address is not a PluginFactory contract
    error InvalidPluginContract();

    /// @notice Thrown if address is not a contract
    error InvalidContract();

    struct Version {
        uint16[3] semanticVersion;
        address pluginFactoryAddress;
        bytes contentURI;
    }

    uint256 internal nextVersionIndex = 0;
    mapping(uint256 => Version) internal versions;
    mapping(bytes32 => uint256) internal versionIdForSemantic;
    mapping(address => uint256) internal latestVersionIdForContract;

    event NewVersion(uint256 versionId, uint16[3] semanticVersion);

    /// @dev Used for UUPS upgradability pattern
    function initialize(address initialOwner) external initializer {
        _registerStandard(type(IPluginRepo).interfaceId);
        __ACL_init(initialOwner);

        nextVersionIndex = 1;

        // set roles.
        _grant(address(this), initialOwner, CREATE_VERSION_ROLE);
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address)
        internal
        virtual
        override
        auth(address(this), UPGRADE_ROLE)
    {}

    /// @inheritdoc IPluginRepo
    function newVersion(
        uint16[3] memory _newSemanticVersion,
        address _pluginFactoryAddress,
        bytes calldata _contentURI
    ) external auth(address(this), CREATE_VERSION_ROLE) {
        // check if _pluginFactoryAddress is IPluginFactory
        if (!Address.isContract(_pluginFactoryAddress)) revert InvalidContract();

        try
            IPluginFactory(_pluginFactoryAddress).supportsInterface(
                PluginFactoryIDs.PLUGIN_FACTORY_INTERFACE_ID
            )
        returns (bool result) {
            if (!result) revert InvalidPluginInterface();
        } catch {
            revert InvalidPluginContract();
        }

        address basePluginAddress = IPluginFactory(_pluginFactoryAddress).getBasePluginAddress();
        uint256 currentVersionIndex = nextVersionIndex - 1;

        uint16[3] memory currentSematicVersion;

        if (currentVersionIndex > 0) {
            Version storage currentVersion = versions[currentVersionIndex];
            currentSematicVersion = currentVersion.semanticVersion;

            address currentBasePluginAddress = IPluginFactory(currentVersion.pluginFactoryAddress)
                .getBasePluginAddress();

            // Only allows base smart contract change on major version bumps
            if (
                !(currentBasePluginAddress == basePluginAddress ||
                    _newSemanticVersion[0] > currentVersion.semanticVersion[0])
            ) {
                revert InvalidVersion();
            }
        }

        if (!isValidBump(currentSematicVersion, _newSemanticVersion)) revert InvalidBump();

        uint256 versionId = nextVersionIndex++;
        versions[versionId] = Version(_newSemanticVersion, _pluginFactoryAddress, _contentURI);
        versionIdForSemantic[semanticVersionHash(_newSemanticVersion)] = versionId;
        latestVersionIdForContract[_pluginFactoryAddress] = versionId;

        emit NewVersion(versionId, _newSemanticVersion);
    }

    /// @notice get latest plugin
    /// @return semanticVersion Semantic version for latest pluginRepo version
    /// @return pluginFactoryAddress Address of latest plugin factory for version
    /// @return contentURI External URI for fetching latest version's content
    function getLatest()
        public
        view
        returns (
            uint16[3] memory semanticVersion,
            address pluginFactoryAddress,
            bytes memory contentURI
        )
    {
        return getByVersionId(nextVersionIndex - 1);
    }

    /// @notice get latest by plugin factory address
    /// @return semanticVersion Semantic version for pluginRepo version
    /// @return pluginFactoryAddress Address of plugin factory for version
    /// @return contentURI External URI for fetching version's content
    function getLatestForContractAddress(address _pluginFactoryAddress)
        public
        view
        returns (
            uint16[3] memory semanticVersion,
            address pluginFactoryAddress,
            bytes memory contentURI
        )
    {
        return getByVersionId(latestVersionIdForContract[_pluginFactoryAddress]);
    }

    /// @notice get latest by semantic version
    /// @return semanticVersion Semantic version for latest pluginRepo version
    /// @return pluginFactoryAddress Address of plugin factory for version
    /// @return contentURI External URI for fetching latest version's content
    function getBySemanticVersion(uint16[3] memory _semanticVersion)
        public
        view
        returns (
            uint16[3] memory semanticVersion,
            address pluginFactoryAddress,
            bytes memory contentURI
        )
    {
        return getByVersionId(versionIdForSemantic[semanticVersionHash(_semanticVersion)]);
    }

    /// @notice get latest by version id
    /// @return semanticVersion Semantic version for pluginRepo version
    /// @return pluginFactoryAddress Address of plugin factory for version
    /// @return contentURI External URI for fetching version's content
    function getByVersionId(uint256 _versionId)
        public
        view
        returns (
            uint16[3] memory semanticVersion,
            address pluginFactoryAddress,
            bytes memory contentURI
        )
    {
        if (!(_versionId > 0 && _versionId < nextVersionIndex)) revert VersionDoesNotExist();
        Version storage version = versions[_versionId];
        return (version.semanticVersion, version.pluginFactoryAddress, version.contentURI);
    }

    /// @notice get version count
    /// @return uint256 count value
    function getVersionCount() public view returns (uint256) {
        return nextVersionIndex - 1;
    }

    /// @notice check if new version is valid compared to the previous one
    /// @param _oldVersion Old semantic version
    /// @param _newVersion New semantic version
    /// @return bool True if bump is valid
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
            i++;
        }
        return hasBumped;
    }

    /// @notice Generate hash from semantic version
    /// @param version Semantic version array
    /// @return bytes32 Hash of the semantic version
    function semanticVersionHash(uint16[3] memory version) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(version[0], version[1], version[2]));
    }
}
