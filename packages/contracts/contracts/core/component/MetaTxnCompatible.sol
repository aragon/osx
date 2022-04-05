// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @title Meta transaction compatibility
/// @author Michael Heuer - Aragon Association - 2022
/// @notice Provides meta transactions compatibility for inheriting classe by overriding _msgSender() and _msgData()
/// @dev All contracts in the framework MUST be compatible and therefore use _msgSender() and _msgData() instead of the default primitives msg.sender and msg.data
abstract contract MetaTxnCompatible {
    /// @notice Meta transaction compatibilty for msg.sender
    function _msgSender() internal virtual view returns (address) {
        return msg.sender;
    }

    /// @notice Meta transaction compatibilty for msg.data
    function _msgData() internal virtual view returns (bytes calldata) {
        return msg.data;
    }
}
