/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../../lib/governance-primitives/GovernancePrimitive.sol";
import "../permissions/Permissions.sol";
import "../executor/Executor.sol";
import "../DAO.sol";

/// @title The processes contract defining the flow of every interaction with the DAO
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract is a central point of the Aragon DAO framework and handles all the processes and stores the different process types with his governance primitives a DAO can have.
/// @dev A list of process types are stored here pluss it validates if the passed actions in a proposal are valid.
contract Processes is UpgradableComponent { 

    bytes32 public constant PROCESSES_START_ROLE = keccak256("PROCESSES_START_ROLE");
    bytes32 public constant PROCESSES_SET_ROLE = keccak256("PROCESSES_SET_ROLE");

    event ProcessStarted(GovernancePrimitive.Proposal indexed proposal, uint256 indexed executionId);
    event NewProcessAdded(string indexed name, Process indexed process);

    struct Process {
        GovernancePrimitive governancePrimitive; // The primitve to execute for example a simple yes/no voting.
        Permissions.GovernancePrimitivePermissions permissions; // A struct with all permission hashes for any possible governance primitive permission.
        AllowedActions[] allowedActions; // Allowed actions this process can call
        bytes metadata; // The IPFS hash that points to a JSON file that describes this specific governance process.
    }

    struct AllowedActions {
        address to; // Allowed contract to call
        bytes4[] methods; // The method signatures of the allowed method calls
    }
    
    mapping(string => Process) public processes; // All existing governance processes in this DAO

    constructor() initializer {}

    /// @dev Used for UUPS upgradability pattern
    /// @param _dao The DAO contract of the current DAO
    function initialize(DAO _dao) public override initializer {
        Component.initialize(_dao);
    }

    /// @notice Starts the given process resp. primitive by the given proposal
    /// @dev Checks the passed actions, gets the governance primitive of this process, and starts it
    /// @param proposal The proposal for execution submitted by the user.
    /// @return process The Process struct stored
    /// @return executionId The id of the newly created execution.
    function start(GovernancePrimitive.Proposal calldata proposal) 
        external 
        authP(PROCESSES_START_ROLE) 
        returns (Process memory process, uint256 executionId) 
    {
        process = processes[proposal.processName];
        require(checkActions(proposal.actions, process.allowedActions), "Not allowed action!");

        executionId = GovernancePrimitive(process.governancePrimitive).start(process, proposal);
        
        emit ProcessStarted(proposal, executionId);

        return (process, executionId);
    }

    /// @notice Adds a new process to the DAO
    /// @param name The name of the new process
    /// @param process The process struct defining the new DAO process
    function setProcess(string calldata name, Process calldata process) 
        public 
        authP(PROCESSES_SET_ROLE) 
    {
        // TODO: Check if name already exists
        processes[name] = process;

        emit NewProcessAdded(name, process);
    }

    // TODO: Optimize this!
    /// @notice Checks if the passed actions are allowed to be executed with the selected process
    /// @dev Checks the passed actions, gets the governance primitive of this process, and starts it
    /// @param actions The proposal for execution submitted by the user.
    /// @param allowedActions The proposal for execution submitted by the user.
    /// @return valid Returns the validity bool value after validating the actions
    function checkActions(Executor.Action[] calldata actions, AllowedActions[] memory allowedActions) 
        internal pure 
        returns (bool valid) 
    {
        uint256 actionsLength = actions.length;
        uint256 allowedActionsLength = allowedActions.length;
        bool allowed = false;

        for (uint256 i = 0; i < actionsLength; i++) { // FOR EVERY PROPOSAL ACTION
            Executor.Action calldata action = actions[i];
            for (uint256 k = 0; k < allowedActionsLength; k++) { // FOR EVERY ALLOWED CONTRACT
                AllowedActions memory allowedAction = allowedActions[k];
                if (action.to == allowedAction.to) { // CONTRACT MATCHED
                    uint256 methodsLength = allowedAction.methods.length;
                    for (uint256 y = 0; y < methodsLength; y++) { // CHECK FOR EVERY ALLOWD METHOD OF A CONTRACT
                        if (bytes4(action.data[:4]) == allowedAction.methods[y]) { // METHOD FOUND STOP SEARCHING
                            allowed = true;
                            break;
                        } else { // METHOD NOT FOUND
                            allowed = false;
                        }
                    }

                    if (allowed) {
                        break;
                    }
                }
            }
            
            if (!allowed) {
                return false;
            }
        }

        return true;
    }
}
