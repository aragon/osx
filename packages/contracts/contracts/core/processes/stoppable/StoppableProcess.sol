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
    /// @notice Used in ERC165
    bytes4 internal constant STOPPABLE_PROCESS_INTERFACE_ID = PROCESS_INTERFACE_ID ^ type(StoppableProcess).interfaceId;

    /// @notice Emitted as soon as the process does get stopped
    event ProcessStopped(Execution indexed execution, uint256 indexed executionId);

    /// @notice The role identifier to stop a process
    bytes32 public constant PROCESS_STOP_ROLE = keccak256("PROCESS_STOP_ROLE");

    /// @dev Used for UUPS upgradability pattern
    /// @param _allowedActions A dynamic bytes array to define the allowed actions. Addr + funcSig byte strings.
    function initialize(IDAO _dao, bytes[] calldata _allowedActions) public virtual override initializer {
        _initProcess(_dao, _allowedActions);
        _registerStandard(STOPPABLE_PROCESS_INTERFACE_ID);
    }

    /// @notice If called the execution is stopped.
    /// @dev The state of the container does get changed to STOPPED and the concrete implementation in _stop called.
    /// @param _executionId The identifier of the current execution
    /// @param _data The arbitrary custom data used for the concrete implementation
    function stop(uint256 _executionId, bytes calldata _data) public auth(PROCESS_STOP_ROLE) {
        Execution storage execution = _getExecution(_executionId);

        require(execution.state == State.RUNNING, ERROR_EXECUTION_STATE_WRONG);
    
        execution.state = State.STOPPED;
        
        _stop(_data);

        emit ProcessStopped(execution, _executionId);
    }

    /// @dev The concrete implementation of stop.
    /// @param _data The arbitrary custom data used for the concrete implementation
    function _stop(bytes calldata _data) internal virtual;
}
