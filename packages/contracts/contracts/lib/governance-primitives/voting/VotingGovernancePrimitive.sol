/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity ^0.8.0;

import "./../GovernancePrimitive.sol";

/// @title Abstract implementation of the voting governance primitive
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract can be used to implement concrete voting governance primitives and being fully compatible with the DAO framework and UI of Aragon
/// @dev You only have to define the specific custom logic of your needs in _vote, _start, and _execute
abstract contract VotingGovernancePrimitive is GovernancePrimitive {
    event VotedOnGovernancePrimitive(Execution indexed execution, bytes indexed data, uint256 executionId);

    /// @notice If called a new vote does get added.
    /// @param executionId The identifier of the current execution
    /// @param data The arbitrary custom data used for the concrete implementation
    function vote(uint256 executionId, bytes calldata data) external executionExist(executionId) {
        Execution memory execution = _getExecution(executionId);
        
        require(execution.state == State.RUNNING, ERROR_EXECUTION_STATE_WRONG);
        require(
            dao.checkPermission(execution.process.permissions.vote),
            ERROR_EXECUTION_STATE_WRONG
        );

        _vote(executionId, data);

        emit VotedOnGovernancePrimitive(execution, data, executionId);
    }

    /// @dev The concrete implementation of vote.
    /// @param data The arbitrary custom data used for the concrete implementation
    function _vote(uint256 executionId, bytes calldata data) internal virtual;
}

