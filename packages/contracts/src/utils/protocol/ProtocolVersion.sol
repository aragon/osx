// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IProtocolVersion} from "./IProtocolVersion.sol";

/// @title ProtocolVersion
/// @author Aragon Association - 2023
/// @notice An abstract, non-upgradeable contract serves as a base for other contracts requiring awareness of their respective protocol version.
abstract contract ProtocolVersion is IProtocolVersion {
    /// @inheritdoc IProtocolVersion
    function protocolVersion() public pure returns (uint8[3] memory) {
        return [1, 3, 0];
    }
}
