// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IProtocolVersion} from "./IProtocolVersion.sol";

/// @title ProtocolVersion
/// @author Aragon X - 2023
/// @notice An abstract, stateless, non-upgradeable contract providing the current Aragon OSx protocol version number.
/// @dev Do not add any new variables to this contract that would shift down storage in the inheritance chain.
/// @custom:security-contact sirt@aragon.org
abstract contract ProtocolVersion is IProtocolVersion {
    // IMPORTANT: Do not add any storage variable, see the above notice.

    /// @inheritdoc IProtocolVersion
    function protocolVersion() public pure returns (uint8[3] memory) {
        return [1, 4, 0];
    }
}
