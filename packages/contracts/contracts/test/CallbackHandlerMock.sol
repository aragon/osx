// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import "../core/component/CallbackHandler.sol";

contract CallbackHandlerMock is CallbackHandler {
    fallback() external {
        _handleCallback(msg.sig, msg.data);
    }

    function registerStandardCallback(bytes4 _callbackSelector, bytes4 _magicNumber) external {
        _registerCallback(_callbackSelector, _magicNumber);
    }
}

contract CallbackHandlerMockHelper {
    address callbackHandlerMockAddr;

    event CallbackReceived(bytes32 b);

    constructor(address _callbackHandlerMockAddr) {
        callbackHandlerMockAddr = _callbackHandlerMockAddr;
    }

    // @notice Executes the `fallback()` function in `CallbackHandlerMock` and emits the returned value.
    // @param selector Any kind of selector in order to call fallback.
    function handleCallback(bytes4 selector) external {
        (, bytes memory value) = callbackHandlerMockAddr.call(abi.encodeWithSelector(selector));
        bytes32 decoded = abi.decode(value, (bytes32));
        emit CallbackReceived(decoded);
    }
}
