// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CrossChainControllerBase} from "./Base.t.sol";
import {
    CrossChainController
} from "@aragon/osx-commons-contracts/src/crosschain/CrossChainController.sol";
import {
    Errors
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";
import {
    DaoUnauthorized
} from "../../../../../src/common/permission/auth/auth.sol";

contract CrossChainControllerUpdateConfigTest is CrossChainControllerBase {
    // -------------------------------------------------------------------------
    // Validation.
    // -------------------------------------------------------------------------

    function test_revertsOnLengthMismatch() public {
        uint256[] memory chainIds = new uint256[](2);
        chainIds[0] = CHAIN_ID;
        chainIds[1] = OTHER_CHAIN_ID;
        CrossChainController.ChainConfig[]
            memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), remoteAdapterA);

        vm.expectRevert(Errors.INVALID_LENGTH_MISMATCH.selector);
        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    function test_revertsOnZeroChainId() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = 0;
        CrossChainController.ChainConfig[]
            memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), remoteAdapterA);

        vm.expectRevert(Errors.INVALID_CHAIN_ID.selector);
        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    function test_revertsOnHalfConfiguredLane_missingRemote() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.ChainConfig[]
            memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), address(0));

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.INCOMPLETE_ADAPTER_CONFIG.selector,
                CHAIN_ID
            )
        );
        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    function test_revertsOnHalfConfiguredLane_missingLocal() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.ChainConfig[]
            memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(0), remoteAdapterA);

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.INCOMPLETE_ADAPTER_CONFIG.selector,
                CHAIN_ID
            )
        );
        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    function test_revertsIfCallerUnauthorized() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.ChainConfig[]
            memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), remoteAdapterA);

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(daoMock),
                address(controller),
                bob,
                UPDATE_CONFIG_PERMISSION_ID
            )
        );
        vm.prank(bob);
        controller.updateConfig(chainIds, configs);
    }

    function test_emitsConfigUpdatedWithCorrectPayload() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.ChainConfig[]
            memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), remoteAdapterA);

        vm.expectEmit(true, false, false, true, address(controller));
        emit ConfigUpdated(CHAIN_ID, address(adapterA), remoteAdapterA);

        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    // -------------------------------------------------------------------------
    // Adapter rotation / per-lane authorization.
    // -------------------------------------------------------------------------

    function test_rotatingLocalAdapterRevokesOldAdapter() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        vm.prank(address(adapterA));
        controller.receiveMessage(
            bytes32(uint256(1)),
            _encodedEmptyTx(1, CHAIN_ID),
            CHAIN_ID
        );

        // Rotate the lane to adapterB.
        _configureLane(CHAIN_ID, address(adapterB), remoteAdapterB);

        assertFalse(
            controller.isRegisteredLocalAdapter(address(adapterA), CHAIN_ID)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.CALLER_NOT_LOCAL_ADAPTER.selector,
                address(adapterA)
            )
        );
        vm.prank(address(adapterA));
        controller.receiveMessage(
            bytes32(uint256(2)),
            _encodedEmptyTx(2, CHAIN_ID),
            CHAIN_ID
        );

        // The new adapter works.
        vm.prank(address(adapterB));
        controller.receiveMessage(
            bytes32(uint256(3)),
            _encodedEmptyTx(3, CHAIN_ID),
            CHAIN_ID
        );
    }

    function test_adapterAuthorizedPerLaneUntilBothLanesCleared() public {
        // adapterA serves two lanes.
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        _configureLane(OTHER_CHAIN_ID, address(adapterA), remoteAdapterB);

        assertTrue(
            controller.isRegisteredLocalAdapter(address(adapterA), CHAIN_ID)
        );

        // Clear the first lane only; adapterA must remain authorized on the
        // other lane (authorization is keyed per (chainId -> localAdapter)).
        _configureLane(CHAIN_ID, address(0), address(0));

        assertTrue(
            controller.isRegisteredLocalAdapter(
                address(adapterA),
                OTHER_CHAIN_ID
            )
        );

        vm.prank(address(adapterA));
        controller.receiveMessage(
            bytes32(uint256(1)),
            _encodedEmptyTx(1, OTHER_CHAIN_ID),
            OTHER_CHAIN_ID
        );

        // Clear the second (last) lane; adapterA now loses authorization there.
        _configureLane(OTHER_CHAIN_ID, address(0), address(0));

        assertFalse(
            controller.isRegisteredLocalAdapter(
                address(adapterA),
                OTHER_CHAIN_ID
            )
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.CALLER_NOT_LOCAL_ADAPTER.selector,
                address(adapterA)
            )
        );
        vm.prank(address(adapterA));
        controller.receiveMessage(
            bytes32(uint256(2)),
            _encodedEmptyTx(2, OTHER_CHAIN_ID),
            OTHER_CHAIN_ID
        );
    }

    function test_clearingLaneWithAllZeroConfigResetsMapping() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        _configureLane(CHAIN_ID, address(0), address(0));

        (address local, address remote) = controller.chainToAdapter(CHAIN_ID);
        assertEq(local, address(0));
        assertEq(remote, address(0));

        // A cleared lane is "unconfigured" again for sends.
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.ADAPTER_NOT_CONFIGURED.selector,
                CHAIN_ID
            )
        );
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }
}
