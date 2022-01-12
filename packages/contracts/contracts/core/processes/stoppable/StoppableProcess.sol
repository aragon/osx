/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "./../Process.sol";

/// @title Abstract implementation of the stoppable governance process
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract can be used to implement concrete stoppable governance processes and being fully compatible with the DAO framework and UI of Aragon
/// @dev You only have to define the specific custom logic for your needs in _start, _execute, and _stop
abstract contract StoppableProcess is Process {
    event ProcessStopped(Execution indexed execution, uint256 indexed executionId);

    // Roles
    bytes32 public constant PROCESS_STOP_ROLE = keccak256("PROCESS_STOP_ROLE");

    /// @notice If called the execution is stopped.
    /// @dev The state of the container does get changed to STOPPED and the concrete implementation in _stop called.
    /// @param executionId The identifier of the current execution
    /// @param data The arbitrary custom data used for the concrete implementation
    function stop(uint256 executionId, bytes calldata data) public auth(PROCESS_STOP_ROLE) {
        Execution storage execution = _getExecution(executionId);

        require(execution.state == State.RUNNING, ERROR_EXECUTION_STATE_WRONG);
    
        execution.state = State.STOPPED;
        
        _stop(data);

        emit ProcessStopped(execution, executionId);
    }

    // @dev The concrete implementation of stop.
    /// @param data The arbitrary custom data used for the concrete implementation
    function _stop(bytes calldata data) internal virtual;
}
