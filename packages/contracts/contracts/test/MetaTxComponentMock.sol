/*
 * SPDX-License-Identifier:    GPL-3.0
 */

pragma solidity 0.8.10;

import "../core/component/MetaTxComponent.sol";

contract MetaTxnComponentMock is MetaTxComponent {
    event DidSomething(address sender, address forwarder);

    function doSomething() external {
        emit DidSomething(_msgSender(), trustedForwarder());
    }

    function versionRecipient() external pure override returns (string memory) {
        return "0.0.1+opengsn.recipient.MetaTxComponentMock";
    }
}
