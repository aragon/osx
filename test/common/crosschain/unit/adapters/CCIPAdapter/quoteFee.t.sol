// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CCIPAdapterBase} from "./Base.t.sol";
import {
    Errors
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";

contract CCIPAdapterQuoteFeeTest is CCIPAdapterBase {
    function test_revertsIfReceiverIsZero() public {
        vm.expectRevert(Errors.RECEIVER_ADDRESS_ZERO.selector);
        adapter.quoteFee(address(0), SEL_ETH_MAINNET, 200_000, "");
    }

    function test_revertsIfBridgeChainIdIsZero() public {
        vm.expectRevert(
            abi.encodeWithSelector(Errors.UNKNOWN_CHAIN_ID.selector, uint256(0))
        );
        adapter.quoteFee(remoteAdapter, 0, 200_000, "");
    }

    function test_returnsRouterQuoteAndConfiguredFeeToken() public {
        router.setFee(7 ether);

        (address feeToken, uint256 fee) = erc20Adapter.quoteFee(
            remoteAdapter,
            CHAIN_ETH_MAINNET,
            200_000,
            ""
        );

        assertEq(feeToken, address(feeTokenErc20));
        assertEq(fee, 7 ether);
    }
}
