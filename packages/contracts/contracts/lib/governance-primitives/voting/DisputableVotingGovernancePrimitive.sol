/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity ^0.8.0;

import "./../disputable/DisputableGovernancePrimitive.sol";
import "./VotingGovernancePrimitive.sol";

/// @title Abstract implementation of the disputable voting governance primitive
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract can be used to implement concrete disputable voting governance primitives and being fully compatible with the DAO framework and UI of Aragon
/// @dev You only have to define the specific custom logic of your needs in _vote, _stop, _start, _halt, _forward, and _execute
abstract contract DisputableVotingGovernancePrimitive is DisputableGovernancePrimitive, VotingGovernancePrimitive { }
