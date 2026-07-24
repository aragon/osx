// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CrossChainControllerBase} from "./Base.t.sol";
import {
    Errors
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";
import {
    DaoUnauthorized
} from "../../../../../src/common/permission/auth/auth.sol";

contract CrossChainControllerSweepTest is CrossChainControllerBase {
    function test_revertsIfCallerUnauthorized() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(daoMock),
                address(controller),
                bob,
                SWEEP_PERMISSION_ID
            )
        );
        vm.prank(bob);
        controller.sweep(address(0), bob, 1 ether);
    }

    function test_revertsIfRecipientIsZeroAddress() public {
        vm.expectRevert(Errors.ZERO_ADDRESS.selector);
        vm.prank(alice);
        controller.sweep(address(0), address(0), 0);
    }

    function test_native_movesExactAmountAndEmits() public {
        vm.deal(address(controller), 5 ether);
        address recipient = makeAddr("recipient");

        vm.expectEmit(true, true, false, true, address(controller));
        emit Swept(address(0), recipient, 2 ether);

        vm.prank(alice);
        controller.sweep(address(0), recipient, 2 ether);

        assertEq(recipient.balance, 2 ether);
        assertEq(address(controller).balance, 3 ether);
    }

    function test_erc20_movesExactAmountAndEmits() public {
        feeToken.setBalance(address(controller), 10 ether);
        address recipient = makeAddr("recipient");

        vm.expectEmit(true, true, false, true, address(controller));
        emit Swept(address(feeToken), recipient, 4 ether);

        vm.prank(alice);
        controller.sweep(address(feeToken), recipient, 4 ether);

        assertEq(feeToken.balanceOf(recipient), 4 ether);
        assertEq(feeToken.balanceOf(address(controller)), 6 ether);
    }
}
