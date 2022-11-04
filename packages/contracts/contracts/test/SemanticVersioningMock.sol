// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {isValidSemanticBump} from "../plugin/SemanticVersioning.sol";

/// @notice A mock contract to test the semantic versioning function `isValidBump`
contract SemanticVersioningMock {
    function isValidBump(uint16[3] memory _oldVersion, uint16[3] memory _newVersion)
        external
        pure
        returns (bool)
    {
        return isValidSemanticBump(_oldVersion, _newVersion);
    }
}
