// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/// @title CallbackHandler
/// @author Aragon Association - 2022
contract CallbackHandler is ERC165 {
    /// @notice ERC165 interface ID -> whether it is supported
    mapping(bytes4 => bool) internal standardSupported;

    /// @notice Callback function signature -> magic number to return
    mapping(bytes4 => bytes32) internal callbackMagicNumbers;

    bytes32 internal constant UNREGISTERED_CALLBACK = bytes32(0);

    // Errors
    error AdapERC165UnkownCallback(bytes32 magicNumber);

    // Events

    /// @notice Emmitted when a new standard is registred and assigned to `interfaceId`
    event StandardRegistered(bytes4 interfaceId);

    /// @notice Emmitted when a callback is registered
    event CallbackRegistered(bytes4 sig, bytes4 magicNumber);

    /// @notice Emmitted when a callback is received
    event CallbackReceived(bytes4 indexed sig, bytes data);

    /// @notice Checks if the contract supports a specific interface or not
    /// @param _interfaceId The identifier of the interface to check for
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return standardSupported[_interfaceId] || super.supportsInterface(_interfaceId);
    }

    /// @notice Handles callbacks to support future versions of the ERC165 or similar without upgrading the contracts.
    /// @param _sig The function signature of the called method (msg.sig)
    /// @param _data The data resp. arguments passed to the method
    function _handleCallback(bytes4 _sig, bytes memory _data) internal {
        bytes32 magicNumber = callbackMagicNumbers[_sig];
        if (magicNumber == UNREGISTERED_CALLBACK)
            revert AdapERC165UnkownCallback({magicNumber: magicNumber});

        emit CallbackReceived(_sig, _data);

        // low-level return magic number
        assembly {
            mstore(0x00, magicNumber)
            return(0x00, 0x20)
        }
    }

    /// @notice Registers a standard and also callback
    /// @param _interfaceId The identifier of the interface to check for
    /// @param _callbackSig The function signature of the called method (msg.sig)
    /// @param _magicNumber The magic number to be registered for the function signature
    function _registerStandardAndCallback(
        bytes4 _interfaceId,
        bytes4 _callbackSig,
        bytes4 _magicNumber
    ) internal {
        _registerStandard(_interfaceId);
        _registerCallback(_callbackSig, _magicNumber);
    }

    /// @notice Registers a standard resp. interface type
    /// @param _interfaceId The identifier of the interface to check for
    function _registerStandard(bytes4 _interfaceId) internal {
        standardSupported[_interfaceId] = true;
        emit StandardRegistered(_interfaceId);
    }

    /// @notice Registers a callback
    /// @param _callbackSig The function signature of the called method (msg.sig)
    /// @param _magicNumber The magic number to be registered for the function signature
    function _registerCallback(bytes4 _callbackSig, bytes4 _magicNumber) internal {
        callbackMagicNumbers[_callbackSig] = _magicNumber;
        emit CallbackRegistered(_callbackSig, _magicNumber);
    }
}
