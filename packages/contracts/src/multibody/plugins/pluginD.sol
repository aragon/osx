// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.8;

import {Executor} from "../Executor.sol";
import "hardhat/console.sol";
import "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

contract PluginD {
    error NotPossible();

    Executor public executor;

    constructor(Executor _executor) {
        executor = _executor;
    }

    function execute(
        bytes32 proposalId,
        IDAO.Action[] memory actions
    ) external returns (bytes[] memory execResults, uint256 failureMap) {
        (execResults, failureMap) = executor.execute(proposalId, actions, 0);
    }
}
