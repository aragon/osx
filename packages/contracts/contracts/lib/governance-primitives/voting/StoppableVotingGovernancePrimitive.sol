/*
 * SPDX-License-Identifier:    MIT
 */
 
pragma solidity ^0.8.0;

import "./../stoppable/StoppableGovernancePrimitive.sol";
import "./VotingGovernancePrimitive.sol";

/// @title Abstract implementation of the stoppable voting governance primitive
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract can be used to implement concrete stoppable voting governance primitives and being fully compatible with the DAO framework and UI of Aragon
/// @dev You only have to define the specific custom logic of your needs in _vote, _stop, _start, and _execute
abstract contract StoppableVotingGovernancePrimitive is StoppableGovernancePrimitive, VotingGovernancePrimitive { }
