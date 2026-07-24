// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CCIPAdapterBase} from "./Base.t.sol";
import {
    Errors
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";

/// @notice Tests the standard <-> CCIP-native chain id mapping
///         (`toNativeChainId` / `fromNativeChainId`).
contract CCIPAdapterChainIdMappingTest is CCIPAdapterBase {
    function test_toNativeChainId_returnsConfiguredSelector() public view {
        assertEq(
            adapter.toNativeChainId(CHAIN_ETH_MAINNET),
            uint256(SEL_ETH_MAINNET)
        );
    }

    function test_toNativeChainId_revertsForUnmappedChain() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.UNKNOWN_CHAIN_ID.selector,
                uint256(999)
            )
        );
        adapter.toNativeChainId(999);
    }

    function test_fromNativeChainId_isExactInverseOfToNativeChainId()
        public
        view
    {
        assertEq(
            adapter.fromNativeChainId(uint256(SEL_ETH_MAINNET)),
            CHAIN_ETH_MAINNET
        );
        assertEq(adapter.fromNativeChainId(uint256(SEL_BASE)), CHAIN_BASE);
        assertEq(
            adapter.fromNativeChainId(uint256(SEL_ARBITRUM_ONE)),
            CHAIN_ARBITRUM_ONE
        );
    }

    function test_fromNativeChainId_revertsForUnmappedSelector() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.UNKNOWN_NATIVE_CHAIN_ID.selector,
                uint256(SEL_SEPOLIA)
            )
        );
        adapter.fromNativeChainId(uint256(SEL_SEPOLIA));
    }

    function test_roundTripsOverSeveralConfiguredChains() public view {
        uint256[3] memory chains = [
            CHAIN_ETH_MAINNET,
            CHAIN_BASE,
            CHAIN_ARBITRUM_ONE
        ];
        for (uint256 i = 0; i < chains.length; i++) {
            assertEq(
                adapter.fromNativeChainId(adapter.toNativeChainId(chains[i])),
                chains[i]
            );
        }
    }
}
