// SPDX-License-Identifier: AGPL-3.0-or-later

/* solhint-disable one-contract-per-file */
pragma solidity ^0.8.8;

import {PluginCloneable} from "@aragon/osx-commons-contracts/src/plugin/PluginCloneable.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {Action} from "@aragon/osx-commons-contracts/src/executors/IExecutor.sol";

/// @notice A mock cloneable plugin to be deployed via the minimal proxy pattern.
/// v1.1 (Release 1, Build 1)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginCloneableMockBuild1 is PluginCloneable {
    uint256 public state1;

    function initialize(IDAO _dao) external initializer {
        __PluginCloneable_init(_dao);
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

/// @notice A mock cloneable plugin to be deployed via the minimal proxy pattern.
/// v1.1 (Release 1, Build 2)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginCloneableMockBuild2 is PluginCloneable {
    uint256 public state1;
    uint256 public state2;

    function initialize(IDAO _dao) external initializer {
        __PluginCloneable_init(_dao);
        state1 = 1;
        state2 = 2;
    }
}

/// @notice A mock cloneable plugin missing an initializer function.
/// @dev DO NOT USE IN PRODUCTION!
contract PluginCloneableMockBad is PluginCloneable {
    uint256 public state1;

    function notAnInitializer(IDAO _dao) external {
        __PluginCloneable_init(_dao);
        state1 = 1;
    }
}
