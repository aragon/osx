// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

contract CallbackHandlerMockHelper {
    address callbackHandlerMockAddr;

    event CallbackReceived(bytes32 b);

    constructor(address _callbackHandlerMockAddr) {
        callbackHandlerMockAddr = _callbackHandlerMockAddr;
    }

    // @notice Executes the `fallback()` function in `CallbackHandlerMock` and emits the returned value.
    // @param selector Any kind of selector in order to call fallback.
    function handleCallback(bytes4 selector) external returns (bytes32 magicNumber) {
        (, bytes memory value) = callbackHandlerMockAddr.call(abi.encodeWithSelector(selector));
        magicNumber = abi.decode(value, (bytes32));
    }
}
