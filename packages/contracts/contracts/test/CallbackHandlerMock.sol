// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import "../core/component/CallbackHandler.sol";

contract CallbackHandlerMock is CallbackHandler {
    fallback() external {
        _handleCallback(msg.sig, msg.data);
    }

    function registerStandardAndCallback(
        bytes4 _interfaceId,
        bytes4 _callbackSig,
        bytes4 _magicNumber
    ) external {
        _registerStandardAndCallback(_interfaceId, _callbackSig, _magicNumber);
    }
}

contract CallbackHandlerMockHelper {
    address addr;

    event CallbackReceived(bytes32 b);

    constructor(address _addr) {
        addr = _addr;
    }

    /**
     * @notice Executes fallback function on the CallbackHandlerMock and emits the returned value.
     * @param selector any kind of selector in order to call fallback
     */
    function handleCallback(bytes4 selector) external {
        (, bytes memory value) = addr.call(abi.encodeWithSelector(selector));
        bytes32 decoded = abi.decode(value, (bytes32));
        emit CallbackReceived(decoded);
    }
}
