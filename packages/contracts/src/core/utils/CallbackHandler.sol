// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/// @title CallbackHandler
/// @author Aragon Association - 2022-2023
/// @notice This contract handles callbacks by registering a magic number together with the callback function's selector. It provides the `_handleCallback` function that inherting have to call inside their `fallback()` function  (`_handleCallback(msg.callbackSelector, msg.data)`).  This allows to adaptively register ERC standards (e.g., [ERC-721](https://eips.ethereum.org/EIPS/eip-721), [ERC-1115](https://eips.ethereum.org/EIPS/eip-1155), or future versions of [ERC-165](https://eips.ethereum.org/EIPS/eip-165)) and returning the required magic numbers for the associated callback functions for the inheriting contract so that it doesn't need to be upgraded.
/// @dev This callback handling functionality is intented to be used by executor contracts (i.e., `DAO.sol`).
abstract contract CallbackHandler {
    /// @notice A mapping between callback function selectors and magic return numbers.
    mapping(bytes4 => bytes4) internal callbackMagicNumbers;

    /// @notice The magic number refering to unregistered callbacks.
    bytes4 internal constant UNREGISTERED_CALLBACK = bytes4(0);

    /// @notice Thrown if the callback function is not registered.
    /// @param callbackSelector The selector of the callback function.
    /// @param magicNumber The magic number to be registered for the callback function selector.
    error UnkownCallback(bytes4 callbackSelector, bytes4 magicNumber);

    /// @notice Emitted when `_handleCallback` is called.
    /// @param sender Who called the callback.
    /// @param sig The function signature.
    /// @param data The calldata for the function signature.
    event CallbackReceived(address sender, bytes4 indexed sig, bytes data);

    /// @notice Handles callbacks to adaptively support ERC standards.
    /// @dev This function is supposed to be called via `_handleCallback(msg.sig, msg.data)` in the `fallback()` function of the inheriting contract.
    /// @param _callbackSelector The function selector of the callback function.
    /// @return The magic number registered for the function selector triggering the fallback.
    function _handleCallback(
        bytes4 _callbackSelector,
        bytes memory _data
    ) internal virtual returns (bytes4) {
        bytes4 magicNumber = callbackMagicNumbers[_callbackSelector];
        if (magicNumber == UNREGISTERED_CALLBACK) {
            revert UnkownCallback({callbackSelector: _callbackSelector, magicNumber: magicNumber});
        }

        emit CallbackReceived({sender: msg.sender, sig: _callbackSelector, data: _data});

        return magicNumber;
    }

    /// @notice Registers a magic number for a callback function selector.
    /// @param _callbackSelector The selector of the callback function.
    /// @param _magicNumber The magic number to be registered for the callback function selector.
    function _registerCallback(bytes4 _callbackSelector, bytes4 _magicNumber) internal virtual {
        callbackMagicNumbers[_callbackSelector] = _magicNumber;
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
