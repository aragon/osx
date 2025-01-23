// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";

contract Blax {
    function init(uint k) public {}
}

contract Factory {
    using ProxyLib for address;

    function deployAnother() public {
        address b = address(new Blax());

        bytes memory initData = abi.encodeCall(Blax.init, (5));

        revert("fuck");
        b.deployUUPSProxy(initData);
    }
}
