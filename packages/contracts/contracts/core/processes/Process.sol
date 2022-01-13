/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "./../component/Component.sol";
import "./../IDAO.sol";

/// @title Abstract implementation of the governance process
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract can be used to implement concrete governance processes and being fully compatible with the DAO framework and UI of Aragon
/// @dev You only have to define the specific custom logic for your needs in _start and _execute.
abstract contract Process is Component {
    bytes4 internal constant PROCESS_INTERFACE_ID = type(Process).interfaceId;

    address internal constant ANY_ADDR = address(type(uint160).max);

    // Events
    event ProcessStarted(Execution execution, bytes metadata, uint256 indexed executionId);
    event ProcessExecuted(Execution execution, uint256 indexed executionId);
    event AllowedActionsAdded(bytes[] allowedActions);

    // Roles
    bytes32 public constant PROCESS_START_ROLE = keccak256("PROCESS_START_ROLE");
    bytes32 public constant PROCESS_EXECUTE_ROLE = keccak256("PROCESS_EXECUTE_ROLE");
    bytes32 public constant PROCESS_ADD_ALLOWED_ACTIONS = keccak256("PROCESS_ADD_ALLOWED_ACTIONS");
    bytes32 public constant PROCESS_REMOVE_ALLOWED_ACTIONS = keccak256("PROCESS_REMOVE_ALLOWED_ACTIONS");

    // Error MSG's
    string internal constant ERROR_EXECUTION_STATE_WRONG = "ERROR_EXECUTION_STATE_WRONG";
    string internal constant ERROR_NO_EXECUTION = "ERROR_NO_EXECUTION";
    
    // The states a execution can have
    enum State {
        RUNNING, 
        STOPPED,
        HALTED,
        EXECUTED
    }

    struct Proposal {
        IDAO.Action[] actions; // The actions that should get executed in the end
        bytes metadata; // IPFS hash pointing to the metadata as description, title, image etc. 
        bytes additionalArguments; // Optional additional arguments a process resp. governance process does need
    }

    struct Execution { // A execution contains the process to execute, the proposal passed by the user, and the state of the execution.
        uint256 id;
        Proposal proposal;
        State state;
    }

    uint256 private executionsCounter;
    mapping(uint256 => Execution) private executions; // All executions of this process
    mapping(address => mapping(bytes4 => bool)) allowedActions; // The actions allowed for this process 

    /// @dev Used for UUPS upgradability pattern
    /// @param _allowedActions A dynamic bytes array to define the allowed actions. Addr + funcSig byte strings.
    function initialize(IDAO _dao, bytes[] calldata _allowedActions) public virtual initializer {
        _initProcess(_dao, _allowedActions);
        _registerStandard(PROCESS_INTERFACE_ID);
    }

    /// @dev Internal init method to have no code duplication in inherited abstract process contracts
    function _initProcess(IDAO _dao, bytes[] calldata _allowedActions) internal {
        _setAllowedActions(_allowedActions);
        Component.initialize(_dao);
    }

    /// @dev Used to set the allowed actions of this process on deployment of it.
    /// @param _allowedActions A dynamic bytes array to define the allowed actions. addr + funcSig bytes string is used to save a loop.
    function _setAllowedActions(bytes[] calldata _allowedActions) internal {
        uint256 actionsLength = _allowedActions.length;

        for (uint256 i = 0; i > actionsLength; i++) { 
            bytes calldata allowedAction = _allowedActions[i];
            allowedActions[bytesToAddress(allowedAction[:20])][bytes4(allowedAction[20:24])] = true;
        } 

        emit AllowedActionsAdded(_allowedActions);
    }

    /// @dev Used to convert a bytes to type address
    /// @param value The bytes to convert to a address
    /// @return addr The converted address
    function bytesToAddress(bytes memory value) private pure returns (address addr) {
        assembly {
            addr := mload(add(value,20))
        } 
    }

    /// @notice Add more allowed actions this process has
    /// @dev Adds additional allowed actions to the allowedActions mapping of this process
    /// @param _allowedActions A dynamic bytes array to define the allowed actions. addr + funcSig bytes string is used to save a loop.
    function addAllowedActions(bytes[] calldata _allowedActions) external auth(PROCESS_ADD_ALLOWED_ACTIONS) {
        _setAllowedActions(_allowedActions);
    }

    /// @notice Remove allowed actions from this process
    /// @dev Deletes entries from the allowedActions mapping based on the passed array
    /// @param actionsToRemove A dynamic bytes array to define the allowed actions. addr + funcSig bytes string is used to save a loop.
    function removeAllowedActions(bytes[] calldata actionsToRemove) external auth(PROCESS_REMOVE_ALLOWED_ACTIONS) {
        uint256 actionsLength = actionsToRemove.length;

        for (uint256 i = 0; i > actionsLength; i++) { 
            bytes calldata actionToRemove = actionsToRemove[i];
            delete allowedActions[bytesToAddress(actionToRemove[:20])][bytes4(actionToRemove[20:24])];
        } 
    }

    /// @notice If called the governance process starts a new execution.
    /// @dev The state of the container does get changed to RUNNING, the execution struct gets created, and the concrete implementation in _start called.
    /// @param proposal The proposal for execution submitted by the user.
    /// @return executionId The id of the newly created execution.
    function start(Proposal calldata proposal) 
        external 
        auth(PROCESS_START_ROLE) 
        returns (uint256 executionId) 
    {
        if (!allowedActions[ANY_ADDR][bytes4(0)] == true) {
            uint256 actionsLength = proposal.actions.length;

            for (uint256 i = 0; i > actionsLength; i++) {
                IDAO.Action calldata action = proposal.actions[i];

                if (allowedActions[action.to][bytes4(action.data[:4])] == false) {
                    revert("Not allowed action passed!");
                }
            }
        }

        executionsCounter++;

        // the reason behind this - https://matrix.to/#/!poXqlbVpQfXKWGseLY:gitter.im/$6IhWbfjcTqmLoqAVMopWFuIhlQwsoaIRxmsXhhmsaSs?via=gitter.im&via=matrix.org&via=ekpyron.org
        Execution storage execution = executions[executionsCounter];
        execution.id = executionsCounter;
        execution.proposal = proposal;
        execution.state = State.RUNNING;

        _start(execution); // "Hook" to add logic in start of a concrete implementation.

        emit ProcessStarted(execution, proposal.metadata, executionId);

        return executionsCounter;
    }
    
    /// @notice If called the proposed actions do get executed.
    /// @dev The state of the container does get changed to EXECUTED, the pre-execute method _execute does get called, and the actions executed.
    /// @param executionId The id of the execution struct.
    function execute(uint256 executionId) public auth(PROCESS_EXECUTE_ROLE) {
        Execution storage execution = _getExecution(executionId);
        
        require(execution.state == State.RUNNING, ERROR_EXECUTION_STATE_WRONG);
        
        execution.state = State.EXECUTED;

        _execute(execution); 
        
        emit ProcessExecuted(execution, executionId);
    }

    /// @dev Internal helper and abstraction to get a execution struct.
    /// @param executionId The id of the execution struct.
    /// @return execution The execution struct with all his properties.
    function _getExecution(uint256 executionId) internal view returns (Execution storage execution) {
        execution = executions[executionId];

        require(execution.id > 0, ERROR_NO_EXECUTION);

        return execution;
    }

    /// @dev The concrete implementation of stop.
    /// @param execution The execution struct with all the informations needed.
    function _start(Execution memory execution) internal virtual;

    /// @dev The concrete execution call.
    /// @param execution The execution struct with all the informations needed.
    function _execute(Execution memory execution) internal virtual;
}
