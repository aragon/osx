/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../core/acl/ACL.sol";
import "../core/erc165/AdaptiveERC165.sol";
import "./IRepo.sol";

contract Repo is IRepo, Initializable, UUPSUpgradeable, ACL, AdaptiveERC165 {
    /* Hardcoded constants to save gas
    bytes32 public constant CREATE_VERSION_ROLE = keccak256("CREATE_VERSION_ROLE");
    */
    bytes32 public constant CREATE_VERSION_ROLE =
        0x1f56cfecd3595a2e6cc1a7e6cb0b20df84cdbd92eff2fee554e70e4e45a9a7d8;
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");

    error InvalidBupm();
    error InvalidVersion();
    error InexistentVersion();

    struct Version {
        uint16[3] semanticVersion;
        address pluginFactoryAddress;
        bytes contentURI;
    }

    uint256 internal versionsNextIndex = 1;
    mapping(uint256 => Version) internal versions;
    mapping(bytes32 => uint256) internal versionIdForSemantic;
    mapping(address => uint256) internal latestVersionIdForContract;

    event NewVersion(uint256 versionId, uint16[3] semanticVersion);

    /// @dev Used for UUPS upgradability pattern
    function initialize(address initialOwner) external initializer {
        _registerStandard(type(IRepo).interfaceId);
        __ACL_init(initialOwner);

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

    /**
     * @notice Create new version with contract `_pluginFactoryAddress` and content `@fromHex(_contentURI)`
     * @param _newSemanticVersion Semantic version for new repo version
     * @param _pluginFactoryAddress address for smart contract logic for version (if set to 0, it uses last versions' pluginFactoryAddress)
     * @param _contentURI External URI for fetching new version's content
     */
    function newVersion(
        uint16[3] memory _newSemanticVersion,
        address _pluginFactoryAddress,
        bytes calldata _contentURI
    ) external auth(address(this), CREATE_VERSION_ROLE) {
        // TODO: check if factoryAddress is IPluginFactory
        address pluginFactoryAddress = _pluginFactoryAddress;
        uint256 lastVersionIndex = versionsNextIndex - 1;

        uint16[3] memory lastSematicVersion;

        if (lastVersionIndex > 0) {
            Version storage lastVersion = versions[lastVersionIndex];
            lastSematicVersion = lastVersion.semanticVersion;

            if (pluginFactoryAddress == address(0)) {
                pluginFactoryAddress = lastVersion.pluginFactoryAddress;
            }
            // Only allows smart contract change on major version bumps
            if (
                lastVersion.pluginFactoryAddress != pluginFactoryAddress ||
                _newSemanticVersion[0] <= lastVersion.semanticVersion[0]
            ) revert InvalidVersion();
        }

        if (!isValidBump(lastSematicVersion, _newSemanticVersion)) revert InvalidBupm();

        uint256 versionId = versionsNextIndex++;
        versions[versionId] = Version(_newSemanticVersion, pluginFactoryAddress, _contentURI);
        versionIdForSemantic[semanticVersionHash(_newSemanticVersion)] = versionId;
        latestVersionIdForContract[pluginFactoryAddress] = versionId;

        emit NewVersion(versionId, _newSemanticVersion);
    }

    function getLatest()
        public
        view
        returns (
            uint16[3] memory semanticVersion,
            address pluginFactoryAddress,
            bytes memory contentURI
        )
    {
        return getByVersionId(versionsNextIndex - 1);
    }

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

    function getByVersionId(uint256 _versionId)
        public
        view
        returns (
            uint16[3] memory semanticVersion,
            address pluginFactoryAddress,
            bytes memory contentURI
        )
    {
        if (_versionId <= 0 && _versionId >= versionsNextIndex) revert InexistentVersion();
        Version storage version = versions[_versionId];
        return (version.semanticVersion, version.pluginFactoryAddress, version.contentURI);
    }

    function getVersionsCount() public view returns (uint256) {
        return versionsNextIndex - 1;
    }

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

    function semanticVersionHash(uint16[3] memory version) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(version[0], version[1], version[2]));
    }
}
