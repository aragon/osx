// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @title ERC165
/// @author Aragon Association - 2022
abstract contract ERC165 {
    /// @notice The interface ID of the `supportsInterface` function.
    bytes4 internal constant ERC165_INTERFACE_ID = bytes4(0x01ffc9a7);

    /// @notice Virtual method to query if a contract supports a certain interface defaulting to the `ERC165_INTERFACE_ID` if it is not overridden.
    /// @param _interfaceId The interface identifier as specified in ERC-165 being queried.
    /// @return True if the inheriting contract implements the requested interface, false otherwise.
    function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool) {
        return _interfaceId == ERC165_INTERFACE_ID;
    }
}
