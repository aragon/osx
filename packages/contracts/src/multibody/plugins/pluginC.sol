// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.8;

import {Executor} from "../Executor.sol";
import "hardhat/console.sol";
import "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

contract PluginC {
    uint256 public proposalId;
    mapping(uint256 => IDAO.Action) public actions;

    Executor public executor;

    constructor(Executor _executor) {
        executor = _executor;
    }

    function createProposal(
        bytes calldata,
        IDAO.Action[] calldata _actions,
        uint64,
        uint64
    ) external returns (uint256 _proposalId) {
        _proposalId = proposalId;
        proposalId = proposalId + 1;
        actions[_proposalId] = _actions[0];
        return _proposalId;
    }

    function execute(
        uint256 _proposalId
    ) external returns (bytes[] memory execResults, uint256 failureMap) {
        IDAO.Action[] memory mainActions = new IDAO.Action[](1);
        mainActions[0] = actions[_proposalId];
        (execResults, failureMap) = executor.execute(bytes32(_proposalId), mainActions, 0);
    }
}
