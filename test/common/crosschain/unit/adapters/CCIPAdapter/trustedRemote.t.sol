// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CCIPAdapterBase} from "./Base.t.sol";

contract CCIPAdapterTrustedRemoteTest is CCIPAdapterBase {
    function test_returnsZeroForUnsetChain() public view {
        assertEq(adapter.trustedRemote(CHAIN_BASE), address(0));
    }

    function test_returnsConfiguredRemoteForSetChain() public view {
        assertEq(adapter.trustedRemote(CHAIN_ETH_MAINNET), remoteController);
    }
}
