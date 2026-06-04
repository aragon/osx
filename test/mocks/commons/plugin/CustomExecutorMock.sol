// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IExecutor, Action} from "../../../../src/common/executors/IExecutor.sol";

/// @notice A mock DAO that anyone can set permissions in.
/// @dev DO NOT USE IN PRODUCTION!
contract CustomExecutorMock is IExecutor {
    error Failed();

    function execute(
        bytes32 callId,
        Action[] memory _actions,
        uint256 allowFailureMap
    ) external override returns (bytes[] memory execResults, uint256 failureMap) {
        if (callId == bytes32(0)) {
            revert Failed();
        } else if (callId == bytes32(uint256(123))) {
            // solhint-disable-next-line reason-string, custom-errors
            revert();
        } else {
            emit Executed(msg.sender, callId, _actions, allowFailureMap, failureMap, execResults);
        }
    }
}
