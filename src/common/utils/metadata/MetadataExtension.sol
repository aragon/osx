// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {DaoAuthorizable} from "../../permission/auth/DaoAuthorizable.sol";

/// @title MetadataExtension
/// @author Aragon X - 2024
/// @notice An abstract, non upgradeable contract for managing and retrieving metadata associated with a plugin.
/// @custom:security-contact sirt@aragon.org
abstract contract MetadataExtension is ERC165, DaoAuthorizable {
    /// @notice The ID of the permission required to call the `setMetadata` function.
    bytes32 public constant SET_METADATA_PERMISSION_ID = keccak256("SET_METADATA_PERMISSION");

    /// @notice Emitted when metadata is set.
    event MetadataSet(bytes metadata);

    /// @dev Stores the current plugin-specific metadata.
    bytes private metadata;

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == this.setMetadata.selector ^ this.getMetadata.selector ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice Allows to set the metadata.
    /// @param _metadata The plugin specific information encoded in bytes.
    function setMetadata(bytes calldata _metadata) public virtual auth(SET_METADATA_PERMISSION_ID) {
        _setMetadata(_metadata);
    }

    /// @notice Returns the metadata currently applied.
    /// @return The plugin specific information encoded in bytes.
    function getMetadata() public view returns (bytes memory) {
        return metadata;
    }

    /// @notice Internal function to update metadata.
    /// @param _metadata The plugin specific information encoded in bytes.
    function _setMetadata(bytes memory _metadata) internal virtual {
        metadata = _metadata;
        emit MetadataSet(_metadata);
    }
}
