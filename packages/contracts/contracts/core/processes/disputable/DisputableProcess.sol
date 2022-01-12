/*
 * SPDX-License-Identifier:    MIT
 */
 
pragma solidity 0.8.10;

import "./../stoppable/StoppableProcess.sol";

/// @title Abstract implementation of the disputable governance process
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract can be used to implement concrete disputable governance processes and being fully compatible with the DAO framework and UI of Aragon
/// @dev You only have to define the specific custom logic of your needs in _start, _execute, _halt, and _forward
abstract contract DisputableProcess is StoppableProcess {
    event ProcessHalted(Execution execution, uint256 indexed executionId);
    event ProcessForwarded(Execution execution, uint256 indexed executionId);

    // Roles
    bytes32 public constant PROCESS_HALT_ROLE = keccak256("PROCESS_HALT_ROLE");
    bytes32 public constant PROCESS_FORWARD_ROLE = keccak256("PROCESS_FORWARD_ROLE");

    /// @notice If called the execution is halted.
    /// @dev The state of the container does get changed to HALTED and the concrete implementation in _halt called.
    /// @param executionId The identifier of the current execution
    /// @param data The arbitrary custom data used for the concrete implementation
    function halt(uint256 executionId, bytes calldata data) public auth(PROCESS_HALT_ROLE) {
        Execution storage execution = _getExecution(executionId);
        
        require(execution.state == State.RUNNING, ERROR_EXECUTION_STATE_WRONG); 
        
        execution.state = State.HALTED;

        _halt(data);

        emit ProcessHalted(execution, executionId);
    }

    /// @notice If called the execution does get forwarded.
    /// @dev The state of the container does get changed to RUNNING and the concrete implementation in _forward called.
    /// @param executionId The identifier of the current execution
    /// @param data The arbitrary custom data used for the concrete implementation
    function forward(uint256 executionId, bytes calldata data) public auth(PROCESS_FORWARD_ROLE) {
        Execution storage execution = _getExecution(executionId);

        require(execution.state == State.RUNNING, ERROR_EXECUTION_STATE_WRONG);
        
        execution.state = State.RUNNING;

        _forward(data);

        emit ProcessForwarded(execution, executionId);
    }

    /// @dev The concrete implementation of halt.
    /// @param data The arbitrary custom data used for the concrete implementation
    function _halt(bytes calldata data) internal virtual;

    /// @dev The concrete implementation of forward.
    /// @param data The arbitrary custom data used for the concrete implementation
    function _forward(bytes calldata data) internal virtual; 
}
