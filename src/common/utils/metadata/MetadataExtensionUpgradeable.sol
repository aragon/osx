// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {DaoAuthorizableUpgradeable} from "../../permission/auth/DaoAuthorizableUpgradeable.sol";

/// @title MetadataExtensionUpgradeable
/// @author Aragon X - 2024
/// @notice An abstract, upgradeable contract for managing and retrieving metadata associated with a plugin.
/// @dev Due to the requirements that already existing upgradeable plugins need to start inheritting from this,
///      we're required to use hardcoded/specific slots for storage instead of sequential slots with gaps.
/// @custom:security-contact sirt@aragon.org
abstract contract MetadataExtensionUpgradeable is ERC165Upgradeable, DaoAuthorizableUpgradeable {
    /// @notice The ID of the permission required to call the `setMetadata` function.
    bytes32 public constant SET_METADATA_PERMISSION_ID = keccak256("SET_METADATA_PERMISSION");

    // keccak256(abi.encode(uint256(keccak256("osx-commons.storage.MetadataExtension")) - 1)) & ~bytes32(uint256(0xff))
    // solhint-disable-next-line  const-name-snakecase
    bytes32 private constant MetadataExtensionStorageLocation =
        0x47ff9796f72d439c6e5c30a24b9fad985a00c85a9f2258074c400a94f8746b00;

    /// @notice Emitted when metadata is updated.
    event MetadataSet(bytes metadata);

    struct MetadataExtensionStorage {
        bytes metadata;
    }

    function _getMetadataExtensionStorage()
        private
        pure
        returns (MetadataExtensionStorage storage $)
    {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := MetadataExtensionStorageLocation
        }
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == this.setMetadata.selector ^ this.getMetadata.selector ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice Allows to update only the metadata.
    /// @param _metadata The utf8 bytes of a content addressing cid that stores plugin's information.
    function setMetadata(bytes calldata _metadata) public virtual auth(SET_METADATA_PERMISSION_ID) {
        _setMetadata(_metadata);
    }

    /// @notice Returns the metadata currently applied.
    /// @return The The utf8 bytes of a content addressing cid.
    function getMetadata() public view returns (bytes memory) {
        MetadataExtensionStorage storage $ = _getMetadataExtensionStorage();
        return $.metadata;
    }

    /// @notice Internal function to update metadata.
    /// @param _metadata The utf8 bytes of a content addressing cid that stores contract's information.
    function _setMetadata(bytes memory _metadata) internal virtual {
        MetadataExtensionStorage storage $ = _getMetadataExtensionStorage();
        $.metadata = _metadata;

        emit MetadataSet(_metadata);
    }
}
