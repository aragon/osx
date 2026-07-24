// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CCIPAdapterBase} from "./Base.t.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {
    IAny2EVMMessageReceiver
} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";

contract CCIPAdapterSupportsInterfaceTest is CCIPAdapterBase {
    function test_IAny2EVMMessageReceiver() public view {
        assertTrue(
            adapter.supportsInterface(type(IAny2EVMMessageReceiver).interfaceId)
        );
    }

    function test_IERC165() public view {
        assertTrue(adapter.supportsInterface(type(IERC165).interfaceId));
    }

    function test_returnsFalseForUnknownInterface() public view {
        assertFalse(adapter.supportsInterface(0xdeadbeef));
    }
}
