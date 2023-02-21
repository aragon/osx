// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {CallbackHandler} from "../../core/utils/CallbackHandler.sol";

contract CallbackHandlerMockHelper is CallbackHandler {
    address callbackHandlerMockAddr;

    /// @notice Calls the internal `_handleCallback` on the parent `CallbackHandler` for testing purposes.
    /// @param selector The function selector of the callback function to be tested.
    /// @param data Arbitrary data accompanying the callback that will be emitted with the `CallbackReceived` event.
    function handleCallback(bytes4 selector, bytes memory data) external returns (bytes4) {
        bytes4 magicNumber = _handleCallback(selector, data);
        return magicNumber;
    }

    /// @notice Executes `_registerCallback` on the parent to register magic number per selector.
    /// @param selector The function selector.
    /// @param magicNumber The selector's magic number.
    function registerCallback(bytes4 selector, bytes4 magicNumber) external {
        _registerCallback(selector, magicNumber);
    }
}
