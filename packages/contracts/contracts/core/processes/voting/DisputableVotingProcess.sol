/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "./../disputable/DisputableProcess.sol";
import "./VotingProcess.sol";

/// @title Abstract implementation of the disputable voting governance process
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract can be used to implement concrete disputable voting governance process and being fully compatible with the DAO framework and UI of Aragon
/// @dev You only have to define the specific custom logic of your needs in _vote, _stop, _start, _halt, _forward, and _execute
abstract contract DisputableVotingProcess is DisputableProcess, VotingProcess { }
