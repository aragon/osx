// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @title Meta transaction compatibility
/// @author Michael Heuer - Aragon Association - 2022
/// @notice Enables compatibility with meta transactions through override of _msgSender() and _msgData()
/// @dev All contracts in the framework MUST be compatible and therefore use _msgSender() and _msgData()
///      instead of the default primitives msg.sender and msg.data
abstract contract MetaTxnCompatible {
    function _msgSender() internal virtual view returns (address) {
        return msg.sender;
    }

    function _msgData() internal virtual view returns (bytes calldata) {
        return msg.data;
    }
}
