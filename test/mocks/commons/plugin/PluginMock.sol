// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {Plugin} from "../../../../src/common/plugin/Plugin.sol";
import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {Action} from "../../../../src/common/executors/IExecutor.sol";

/// @notice A mock plugin to be deployed via the `new` keyword.
/// v1.1 (Release 1, Build 1)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginMockBuild1 is Plugin {
    uint256 public state1;

    constructor(IDAO _dao) Plugin(_dao) {
        state1 = 1;
    }

    function execute(
        uint256 _callId,
        Action[] memory _actions,
        uint256 _allowFailureMap
    ) external returns (bytes[] memory execResults, uint256 failureMap) {
        (execResults, failureMap) = _execute(bytes32(_callId), _actions, _allowFailureMap);
    }

    function execute(
        address _target,
        uint256 _callId,
        Action[] memory _actions,
        uint256 _allowFailureMap,
        Operation _op
    ) external returns (bytes[] memory execResults, uint256 failureMap) {
        (execResults, failureMap) = _execute(
            _target,
            bytes32(_callId),
            _actions,
            _allowFailureMap,
            _op
        );
    }
}
