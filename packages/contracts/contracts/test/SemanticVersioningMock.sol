// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {isValidBumpStrict, isValidBumpLoose} from "../plugin/SemanticVersioning.sol";

/// @notice A mock contract to test the semantic versioning function `isValidBump`
contract SemanticVersioningMock {
    function _isValidBumpStrict(
        uint16[3] memory _oldVersion,
        uint16[3] memory _newVersion
    ) external pure returns (bool) {
        return isValidBumpStrict(_oldVersion, _newVersion);
    }

    function _isValidBumpLoose(
        uint16[3] memory _oldVersion,
        uint16[3] memory _newVersion
    ) external pure returns (bool) {
        return isValidBumpLoose(_oldVersion, _newVersion);
    }
}
