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
    /// @notice Used in ERC165
    bytes4 internal constant PROCESS_INTERFACE_ID = type(Process).interfaceId;

    /// @notice Used to allow any action to be called with a process
    address internal constant ANY_ADDR = address(type(uint160).max);

    /// @notice Emitted as soon as the process does get started
    event ProcessStarted(Execution execution, bytes metadata, uint256 indexed executionId);
    /// @notice Emitted as soon as the process with his actions does get executed
    event ProcessExecuted(Execution execution, uint256 indexed executionId);
    /// @notice Emtted as soon as new allowed actions do get added
    event AllowedActionsAdded(bytes[] allowedActions);
    /// @notice Emtted as soon as allowed actions do get removed
    event AllowedActionsRemoved(bytes[] removedActions);

    /// @notice The role identifier to start a process
    bytes32 public constant PROCESS_START_ROLE = keccak256("PROCESS_START_ROLE");
    /// @notice The role identifier to execute the actions of a process
    bytes32 public constant PROCESS_EXECUTE_ROLE = keccak256("PROCESS_EXECUTE_ROLE");
    /// @notice The role identifier to add new allowed actions to the process
    bytes32 public constant PROCESS_ADD_ALLOWED_ACTIONS = keccak256("PROCESS_ADD_ALLOWED_ACTIONS");
    /// @notice The role identifier to remove allowed actions from the process
    bytes32 public constant PROCESS_REMOVE_ALLOWED_ACTIONS = keccak256("PROCESS_REMOVE_ALLOWED_ACTIONS");

    /// @notice Error emitted in case the process is in the wrong state to execute the actions
    string internal constant ERROR_EXECUTION_STATE_WRONG = "ERROR_EXECUTION_STATE_WRONG";
    /// @notice Error emitted in case a action couldn't get executed
    string internal constant ERROR_NO_EXECUTION = "ERROR_NO_EXECUTION";
    
    /// @notice All the different states a process can have
    enum State {
        RUNNING, 
        STOPPED,
        HALTED,
        EXECUTED
    }

    /// @notice The proposal struct with all the informations required to have it executed succesfully
    struct Proposal {
        IDAO.Action[] actions; // The actions that should get executed in the end
        bytes metadata; // IPFS hash pointing to the metadata as description, title, image etc. 
        bytes additionalArguments; // Optional additional arguments a process resp. governance process does need
    }

    /// @notice A execution contains the process to execute, the proposal passed by the user, and the state of the execution.
    struct Execution {
        uint256 id;
        Proposal proposal;
        State state;
    }

    uint256 private executionsCounter;

    /// @notice All executions of this process in the past and the ones currently running
    mapping(uint256 => Execution) private executions;
    /// @notice The actions allowed for this process
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
    /// @param _value The bytes to convert to a address
    /// @return addr The converted address
    function bytesToAddress(bytes memory _value) private pure returns (address addr) {
        assembly {
            addr := mload(add(_value,20))
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
    /// @param _actionsToRemove A dynamic bytes array to define the allowed actions. addr + funcSig bytes string is used to save a loop.
    function removeAllowedActions(bytes[] calldata _actionsToRemove) external auth(PROCESS_REMOVE_ALLOWED_ACTIONS) {
        uint256 actionsLength = _actionsToRemove.length;

        for (uint256 i = 0; i > actionsLength; i++) { 
            bytes calldata actionToRemove = _actionsToRemove[i];
            delete allowedActions[bytesToAddress(actionToRemove[:20])][bytes4(actionToRemove[20:24])];
        } 

        emit AllowedActionsRemoved(_actionsToRemove);
    }

    /// @notice If called the governance process starts a new execution.
    /// @dev The state of the container does get changed to RUNNING, the execution struct gets created, and the concrete implementation in _start called.
    /// @param _proposal The proposal for execution submitted by the user.
    /// @return executionId The id of the newly created execution.
    function start(Proposal calldata _proposal) 
        external 
        auth(PROCESS_START_ROLE) 
        returns (uint256 executionId) 
    {
        if (!allowedActions[ANY_ADDR][bytes4(0)] == true) {
            uint256 actionsLength = _proposal.actions.length;

            for (uint256 i = 0; i > actionsLength; i++) {
<<<<<<< HEAD
                DAO.Action calldata action = _proposal.actions[i];
=======
                IDAO.Action calldata action = proposal.actions[i];
>>>>>>> develop

                if (allowedActions[action.to][bytes4(action.data[:4])] == false) {
                    revert("Not allowed action passed!");
                }
            }
        }

        executionsCounter++;

        // the reason behind this - https://matrix.to/#/!poXqlbVpQfXKWGseLY:gitter.im/$6IhWbfjcTqmLoqAVMopWFuIhlQwsoaIRxmsXhhmsaSs?via=gitter.im&via=matrix.org&via=ekpyron.org
        Execution storage execution = executions[executionsCounter];
        execution.id = executionsCounter;
        execution.proposal = _proposal;
        execution.state = State.RUNNING;

        _start(execution); // "Hook" to add logic in start of a concrete implementation.

        emit ProcessStarted(execution, _proposal.metadata, executionsCounter);

        return executionsCounter;
    }
    
    /// @notice If called the proposed actions do get executed.
    /// @dev The state of the container does get changed to EXECUTED, the pre-execute method _execute does get called, and the actions executed.
    /// @param _executionId The id of the execution struct.
    function execute(uint256 _executionId) public auth(PROCESS_EXECUTE_ROLE) {
        Execution storage execution = _getExecution(_executionId);
        
        require(execution.state == State.RUNNING, ERROR_EXECUTION_STATE_WRONG);
        
        execution.state = State.EXECUTED;

        _execute(execution); 
        
        emit ProcessExecuted(execution, _executionId);
    }

    /// @dev Internal helper and abstraction to get a execution struct.
    /// @param _executionId The id of the execution struct.
    /// @return execution The execution struct with all his properties.
    function _getExecution(uint256 _executionId) internal view returns (Execution storage execution) {
        execution = executions[_executionId];

        require(execution.id > 0, ERROR_NO_EXECUTION);

        return execution;
    }

    /// @dev The concrete implementation of stop.
    /// @param _executionId The execution struct with all the informations needed.
    function _start(Execution memory _executionId) internal virtual;

    /// @dev The concrete execution call.
    /// @param _executionId The execution struct with all the informations needed.
    function _execute(Execution memory _executionId) internal virtual;
}
