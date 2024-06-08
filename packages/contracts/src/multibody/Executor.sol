// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.8;

import {MultiBody} from "./MultiBody.sol";
import "hardhat/console.sol";
import "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

contract Executor {
    error NotPossible();

    // We use array of actions even though we always revert with > 1
    // This is to allow compatibility as plugins call `execute` with multiple actions.
    function execute(
        bytes32 _callId,
        IDAO.Action[] calldata _actions,
        uint256 _allowFailureMap
    )
        external
        returns (
            // TODO: can we not restrict _actions.length != 1 ? in that case, tokenvoting's actions can be length of 2
            // which will call two different multibody's at the same time - i.e tokenvoting can belong to 2 different
            // multibodies at the same time. Though if so, Executor has to be global otherwise if M1 and M2 have
            // different executors(ex1 and ex2), TokenVoting will either have ex1 or ex2 set on it. If ex1,
            // it will call ex1.execute and in case we do snapshots, ex1 will only be able to get a timestamp
            // of M1 and this brings problems.
            // NOTE THAT we don't need auth permission here. We allow everyone
            // to be able to call this contract. If some contract that is not already in stages in Multibody,
            // Multibody will anyways reject it as `msg.sender` appended won't be the valid one.
            bytes[] memory execResults,
            uint256 failureMap
        )
    {
        if (_actions.length != 1) {
            revert NotPossible();
        }

        // append msg.sender in the end of the actual calldata
        bytes memory callData = abi.encodePacked(_actions[0].data, msg.sender);

        (bool success, bytes memory result) = _actions[0].to.call{value: _actions[0].value}(
            callData
        );
    }
}
