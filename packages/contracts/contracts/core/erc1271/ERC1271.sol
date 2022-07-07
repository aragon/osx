// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @title ERC1271 interface
/// @dev see https://eips.ethereum.org/EIPS/eip-1271
abstract contract ERC1271 {
    // bytes4(keccak256("isValidSignature(bytes32,bytes)")
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;

    /**
     * MUST return the bytes4 magic value 0x1626ba7e when function passes.
     * MUST NOT modify state (using STATICCALL for solc < 0.5, view modifier for solc > 0.5)
     * MUST allow external calls
     */
    /// @notice Checks whether a signature is valid for the provided data
    /// @param _hash The keccak256 hash of arbitrary length data signed on the behalf of address(this)
    /// @param _signature Signature byte array associated with _data
    /// @return magicValue Returns the `bytes4` magic value `0x1626ba7e` if the signature is valid
    function isValidSignature(bytes32 _hash, bytes memory _signature)
        external
        view
        virtual
        returns (bytes4 magicValue);
}
