/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "./../Process.sol";

/// @title Abstract implementation of the voting governance process
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract can be used to implement concrete voting governance primitives and being fully compatible with the DAO framework and UI of Aragon
/// @dev You only have to define the specific custom logic of your needs in _vote, _start, and _execute
abstract contract VotingProcess is Process {
    bytes4 internal constant VOTING_PROCESS_INTERFACE_ID = PROCESS_INTERFACE_ID ^ type(VotingProcess).interfaceId;

    event VotedOnProcess(Execution execution, bytes data, uint256 indexed executionId);

    // Roles
    bytes32 public constant PROCESS_VOTE_ROLE = keccak256("PROCESS_VOTE_ROLE");

    /// @dev Used for UUPS upgradability pattern
    /// @param _allowedActions A dynamic bytes array to define the allowed actions. Addr + funcSig byte strings.
    function initialize(IDAO _dao, bytes[] calldata _allowedActions) public virtual override initializer {
        _initProcess(_dao, _allowedActions);
        _registerStandard(VOTING_PROCESS_INTERFACE_ID);
    }

    /// @notice If called a new vote does get added.
    /// @param executionId The identifier of the current execution
    /// @param data The arbitrary custom data used for the concrete implementation
    function vote(uint256 executionId, bytes calldata data) external auth(PROCESS_VOTE_ROLE) {
        Execution memory execution = _getExecution(executionId);
        
        require(execution.state == State.RUNNING, ERROR_EXECUTION_STATE_WRONG);

        _vote(executionId, data);

        emit VotedOnProcess(execution, data, executionId);
    }

    /// @dev The concrete implementation of vote.
    /// @param data The arbitrary custom data used for the concrete implementation
    function _vote(uint256 executionId, bytes calldata data) internal virtual;
}
