// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @title CallbackHandler
/// @author Aragon Association - 2022
/// @notice This contract handles callbacks by registering a magic number together with the callback function's selector. It provides the `_handleCallback` function that inherting have to call inside their `fallback()` function  (`_handleCallback(msg.callbackSelector, msg.data)`).  This allows to adaptively register ERC standards (e.g., [ERC-721](https://eips.ethereum.org/EIPS/eip-721), [ERC-1115](https://eips.ethereum.org/EIPS/eip-1155), or future versions of [ERC-165](https://eips.ethereum.org/EIPS/eip-165)) and returning the required magic numbers for the associated callback functions for the inheriting contract so that it doesn't need to be upgraded.
/// @dev This callback handling functionality is intented to be used by executor contracts (i.e., `DAO.sol`).
contract CallbackHandler {
    /// @notice A mapping between callback function selectors and magic return numbers.
    mapping(bytes4 => bytes32) internal callbackMagicNumbers;

    /// @notice The magic number refering to unregistered callbacks.
    bytes32 internal constant UNREGISTERED_CALLBACK = bytes32(0);

    /// @notice Thrown if the callback function is not registered.
    /// @param callbackSelector The selector of the callback function.
    /// @param magicNumber The magic number to be registered for the callback function selector.
    error UnkownCallback(bytes4 callbackSelector, bytes32 magicNumber);

    /// @notice Handles callbacks to adaptively support ERC standards.
    /// @param _callbackSelector The selector of the callback function.
    /// @dev This function is supposed to be called via `_handleCallback(msg.sig)` in the `fallback()` function of the inheriting contract.
    function _handleCallback(bytes4 _callbackSelector) internal view {
        bytes32 magicNumber = callbackMagicNumbers[_callbackSelector];
        if (magicNumber == UNREGISTERED_CALLBACK) {
            revert UnkownCallback({callbackSelector: _callbackSelector, magicNumber: magicNumber});
        }
        // low-level return magic number
        assembly {
            mstore(0x00, magicNumber)
            return(0x00, 0x20)
        }
    }

    /// @notice Registers a magic number for a callback function selector.
    /// @param _callbackSelector The selector of the callback function.
    /// @param _magicNumber The magic number to be registered for the callback function selector.
    function _registerCallback(bytes4 _callbackSelector, bytes4 _magicNumber) internal {
        callbackMagicNumbers[_callbackSelector] = _magicNumber;
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
