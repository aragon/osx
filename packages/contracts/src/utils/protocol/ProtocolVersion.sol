// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IProtocolVersion} from "./IProtocolVersion.sol";

/// @title ProtocolVersion
/// @author Aragon Association - 2023
/// @notice An abstract, stateless, non-upgradeable contract serves as a base for other contracts requiring awareness of the OSx protocol version.
/// @dev Do not add any new variables to this contract that would shift down storage in the inheritance chain.
abstract contract ProtocolVersion is IProtocolVersion {
    // IMPORTANT: Do not add any storage variable, see the above notice.

    /// @inheritdoc IProtocolVersion
    function protocolVersion() public pure returns (uint8[3] memory) {
        return [1, 3, 0];
    }
}
