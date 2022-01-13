/*
 * SPDX-License-Identifier:    MIT
 */
 
pragma solidity 0.8.10;

import "./../stoppable/StoppableProcess.sol";
import "./VotingProcess.sol";

/// @title Abstract implementation of the stoppable voting governance process
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract can be used to implement concrete stoppable voting governance processes and being fully compatible with the DAO framework and UI of Aragon
/// @dev You only have to define the specific custom logic of your needs in _vote, _stop, _start, and _execute
abstract contract StoppableVotingProcess is StoppableProcess, VotingProcess {
     bytes4 internal constant STOPPABLE_VOTING_PROCESS_INTERFACE_ID = STOPPABLE_PROCESS_INTERFACE_ID ^ VOTING_PROCESS_INTERFACE_ID;

    /// @dev Used for UUPS upgradability pattern
    /// @param _allowedActions A dynamic bytes array to define the allowed actions. Addr + funcSig byte strings.
    function initialize(
        IDAO _dao,
        bytes[] calldata _allowedActions
    ) public virtual override(StoppableProcess, VotingProcess) initializer {
        _initProcess(_dao, _allowedActions);
        _registerStandard(STOPPABLE_VOTING_PROCESS_INTERFACE_ID);
    }
}
