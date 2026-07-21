// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Script, console} from "forge-std/Script.sol";

import {CrossChainWiringCheck} from "./CrossChainWiringCheck.sol";

/// @notice Read-only wiring verification for an already-deployed
///         `CrossChainController` + `CCIPAdapter` pair. Prints every
///         `CrossChainWiringCheck` finding and reverts if any of them failed,
///         so it can be wired into CI or run manually before/after a
///         governance proposal that touches cross-chain config.
/// @dev Deliberately does NOT `vm.startBroadcast`: this script only reads
///      chain state, it never sends a transaction.
contract VerifyCrossChain is Script {
    function run() public view {
        address controller = vm.envAddress("CONTROLLER");
        address adapter = vm.envAddress("ADAPTER");
        address daoAddress = vm.envAddress("DAO_ADDRESS");

        uint256[] memory remoteChainIds = vm.envOr("REMOTE_CHAIN_IDS", ",", new uint256[](0));
        address[] memory remoteControllers = vm.envOr("REMOTE_CONTROLLERS", ",", new address[](0));
        address[] memory remoteAdapters = vm.envOr("REMOTE_ADAPTERS", ",", new address[](0));
        // `Vm` has no `uint64[]` overload of `envOr`; parse as `uint256[]` and
        // narrow, matching what `ChainConfig.bridgeChainId` / CCIP selectors
        // actually are (`uint64`).
        uint256[] memory remoteSelectorsWide = vm.envOr("REMOTE_SELECTORS", ",", new uint256[](0));

        // Default: 1 wei of native, or 1 (LINK-)wei of the ERC20 fee token --
        // i.e. "must not be literally empty", not a real funding target.
        // Operators running this ahead of a real send should pass a
        // realistic `MIN_FEE_BALANCE` explicitly.
        uint256 minFeeBalance = vm.envOr("MIN_FEE_BALANCE", uint256(1));

        if (
            remoteChainIds.length != remoteControllers.length ||
            remoteChainIds.length != remoteAdapters.length ||
            remoteChainIds.length != remoteSelectorsWide.length
        ) {
            revert(
                "REMOTE_CHAIN_IDS / REMOTE_CONTROLLERS / REMOTE_ADAPTERS / REMOTE_SELECTORS length mismatch"
            );
        }

        CrossChainWiringCheck.Expectation[] memory expectations =
            new CrossChainWiringCheck.Expectation[](remoteChainIds.length);
        for (uint256 i = 0; i < remoteChainIds.length; i++) {
            uint256 wideSelector = remoteSelectorsWide[i];
            if (wideSelector > type(uint64).max) {
                revert("REMOTE_SELECTORS entry does not fit in uint64");
            }
            expectations[i] = CrossChainWiringCheck.Expectation({
                chainId: remoteChainIds[i],
                expectedRemoteController: remoteControllers[i],
                expectedRemoteAdapter: remoteAdapters[i],
                // casting to 'uint64' is safe: bounds-checked immediately above
                // forge-lint: disable-next-line(unsafe-typecast)
                expectedSelector: uint64(wideSelector)
            });
        }

        console.log("CrossChainController + CCIPAdapter wiring verification");
        console.log("- Chain ID:  ", block.chainid);
        console.log("- Controller:", controller);
        console.log("- Adapter:   ", adapter);
        console.log("- DAO:       ", daoAddress);
        console.log("- Remote lanes checked:", expectations.length);
        console.log();

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = CrossChainWiringCheck.check(
            controller,
            adapter,
            daoAddress,
            expectations,
            minFeeBalance
        );

        for (uint256 i = 0; i < findings.length; i++) {
            CrossChainWiringCheck.Finding memory finding = findings[i];
            console.log(finding.ok ? "[ OK ]" : "[FAIL]", finding.what);
            console.log("      ", finding.detail);
        }

        console.log();
        console.log("=== Summary ===");
        console.log("- Total findings:", findings.length);
        console.log("- Failures:      ", failures);

        if (failures == 0) {
            console.log("All wiring checks passed.");
        } else {
            console.log("WIRING CHECK FAILED. Fix the [FAIL] findings above before relying on this lane.");
        }

        // Reverting here (rather than just logging) is what makes this
        // script usable as a CI gate: `forge script` exits non-zero on an
        // unhandled revert.
        CrossChainWiringCheck.requireOk(findings, failures);
    }
}
