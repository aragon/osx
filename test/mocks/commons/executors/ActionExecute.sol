// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IExecutor, Action} from "../../../../src/common/executors/Executor.sol";

/// @notice A dummy contract to test if Executor can successfully execute an action.
contract ActionExecute {
    uint256 internal _num = 10;

    function setTest(uint256 newNum) public returns (uint256) {
        _num = newNum;
        return _num;
    }

    function fail() public pure {
        // solhint-disable-next-line reason-string, custom-errors
        revert("ActionExecute:Revert");
    }

    // Used to test custom reentrancy guard
    // that is implemented on Executor contract's
    // execute function.
    function callBackCaller() public {
        IExecutor(msg.sender).execute(bytes32(0), new Action[](0), 0);
    }
}
