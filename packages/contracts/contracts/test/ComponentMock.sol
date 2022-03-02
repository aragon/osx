/*
 * SPDX-License-Identifier:    GPL-3.0
 */

pragma solidity 0.8.10;

import "../core/component/Component.sol";

contract ComponentMock is Component {

    event DidSomething(address sender, address forwarder);

    /// @dev describes the version and contract for GSN compatibility.
    function versionRecipient() external override virtual view returns (string memory){
        return "0.0.1+opengsn.recipient.ComponentMock";
    }

    function doSomething() external {
        emit DidSomething(_msgSender(), trustedForwarder());
    }
}