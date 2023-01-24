// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import {CallbackHandler} from "../core/component/CallbackHandler.sol";

contract CallbackHandlerMockHelper is CallbackHandler {
    address callbackHandlerMockAddr;

    /// @notice Executes _handleCallback on the parens for testing purposes.
    /// @param selector Any kind of selector in order to call fallback.
    /// @param data Some arbitrary data. Mainly, you should pass msg.data to _handleCallback most of the time.
    function handleCallback(bytes4 selector, bytes memory data) external returns (bytes4) {
        bytes4 magicNumber = _handleCallback(selector, data);      
        return magicNumber;
    }

    /// @notice Executes `_registerCallback` on the parent to register magic number per selector.
    /// @param selector The function selector
    /// @param magicNumber The selector's magic number.
    function registerCallback(bytes4 selector, bytes4 magicNumber) external {
        _registerCallback(selector, magicNumber);
    }
}
