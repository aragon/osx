/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import '../core/acl/IACLOracle.sol';

contract ACLOracleMock is IACLOracle {
    bool internal _willPerformResult = true;

    function willPerform(
        address /* _where */,
        address /* _who */,
        bytes32 /* _role */,
        bytes memory /* _data */
    ) external view returns (bool) {
        return _willPerformResult;
    }

    function setWillPerform(bool _result) external {
        _willPerformResult = _result;
    }
}
