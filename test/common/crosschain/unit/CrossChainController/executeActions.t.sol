// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CrossChainControllerBase} from "./Base.t.sol";
import {
    Errors
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";

contract CrossChainControllerExecuteActionsTest is CrossChainControllerBase {
    /// @dev `executeActions` is external only so `receiveMessage` can wrap it in
    ///      a try/catch; it must reject any caller other than the controller
    ///      itself.
    function test_revertsIfCallerNotSelf() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.CALLER_NOT_SELF.selector,
                address(this)
            )
        );
        controller.executeActions(bytes32(0), _emptyActionsPayload());
    }
}
