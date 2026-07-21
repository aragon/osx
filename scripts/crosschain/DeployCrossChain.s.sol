// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {IDAO} from "../../src/common/dao/IDAO.sol";
import {CrossChainController} from "../../src/common/crosschain/CrossChainController.sol";
import {CCIPAdapter} from "../../src/common/crosschain/adapters/CCIP/CCIPAdapter.sol";

import {CCIPChains} from "./CCIPChains.sol";

/// @notice Deploys a `CrossChainController` + `CCIPAdapter` pair on THIS chain
///         for a single OSx DAO, and prints every DAO action a human/proposal
///         must still take to make it live.
/// @dev TWO-PHASE BY CONSTRUCTION. Chain A cannot know chain B's controller /
///      adapter addresses before chain B is deployed (and vice versa), so a
///      lane is very often only half-known on any single run of this script.
///      Passing `address(0)` for a remote controller/adapter is how the
///      deployer expresses "not deployed yet"; this script tolerates it and
///      loudly flags every lane left in that state so it cannot be missed.
///
///      Permissions are NEVER granted here. Every permission this pair needs
///      is DAO-authorized (`DaoAuthorizable.auth`), so granting them is
///      itself a DAO action -- this script only prints what that action must
///      be. See `printDaoActionsRequired`.
contract DeployCrossChain is Script {
    using stdJson for string;

    /// @notice `EXECUTE_PERMISSION` as defined by `DAO.sol`. Re-declared here
    ///         because it lives on the concrete `DAO` implementation, not on
    ///         `IDAO`, and this script only depends on the interface.
    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");

    CrossChainController controller;
    CCIPAdapter adapter;

    address dao;
    address router;
    address feeToken;

    uint256[] remoteChainIds;
    address[] remoteControllers;
    address[] remoteAdapters;

    modifier broadcast() {
        uint256 privKey = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(privKey);

        console.log("CrossChainController + CCIPAdapter deployment");
        console.log("- Deployer:", vm.addr(privKey));
        console.log("- Chain ID:", block.chainid);
        console.log();

        _;

        vm.stopBroadcast();
    }

    function run() public broadcast {
        dao = vm.envAddress("DAO_ADDRESS");
        router = vm.envOr("CCIP_ROUTER", CCIPChains.routerOf(block.chainid));
        feeToken = vm.envOr("FEE_TOKEN", address(0));

        remoteChainIds = vm.envOr("REMOTE_CHAIN_IDS", ",", new uint256[](0));
        remoteControllers = vm.envOr("REMOTE_CONTROLLERS", ",", new address[](0));
        remoteAdapters = vm.envOr("REMOTE_ADAPTERS", ",", new address[](0));

        if (
            remoteChainIds.length != remoteControllers.length ||
            remoteChainIds.length != remoteAdapters.length
        ) {
            revert(
                "REMOTE_CHAIN_IDS / REMOTE_CONTROLLERS / REMOTE_ADAPTERS length mismatch"
            );
        }

        console.log("- DAO:        ", dao);
        console.log("- CCIP Router:", router);
        console.log("- Fee token:  ", feeToken == address(0) ? "native currency" : "");
        if (feeToken != address(0)) console.log("               ", feeToken);
        console.log("- Remote lanes:", remoteChainIds.length);
        console.log();

        // -----------------------------------------------------------------
        // Deploy the controller first: the adapter's constructor calls
        // `CrossChainController(_controller).dao()` to adopt its permission
        // manager, so the controller must already exist and already know
        // its DAO.
        // -----------------------------------------------------------------
        controller = new CrossChainController(dao);
        vm.label(address(controller), "CrossChainController");

        // -----------------------------------------------------------------
        // Build the RECEIVE-side chain-id <-> CCIP-selector map.
        //
        // Every remote lane's selector is included, plus -- deliberately --
        // THIS chain's own (chainId -> selector) pair.
        //
        // Reasoning (this is NOT required for `ccipReceive` to function: CCIP
        // never delivers a message whose reported source chain is this same
        // chain, so `_selectorToChainId[thisSelector]` is never consulted by
        // the receive path in practice):
        //   - it is harmless. This map is receive-side-only and purely
        //     translates a selector into a standard chain id for
        //     authentication; even if some future bug fed this chain's own
        //     selector into `ccipReceive`, `_trustedRemotes[block.chainid]`
        //     is never set by this script (there is no "remote controller"
        //     entry for our own chain), so `REMOTE_NOT_TRUSTED` would still
        //     fire.
        //   - it makes `adapter.toNativeChainId(block.chainid)` and
        //     `adapter.fromNativeChainId(selectorOf(block.chainid))` resolve
        //     instead of reverting, which is genuinely useful for operators
        //     and for tooling (e.g. `CrossChainWiringCheck`-style scripts)
        //     that want to sanity-check "does this adapter agree with
        //     `CCIPChains` about its own chain" without special-casing the
        //     local chain out of every loop.
        // -----------------------------------------------------------------
        uint256 selectorMapLength = remoteChainIds.length + 1;
        uint256[] memory selectorChainIds = new uint256[](selectorMapLength);
        uint64[] memory chainSelectors = new uint64[](selectorMapLength);
        for (uint256 i = 0; i < remoteChainIds.length; i++) {
            selectorChainIds[i] = remoteChainIds[i];
            chainSelectors[i] = CCIPChains.selectorOf(remoteChainIds[i]);
        }
        selectorChainIds[remoteChainIds.length] = block.chainid;
        chainSelectors[remoteChainIds.length] = CCIPChains.selectorOf(block.chainid);

        adapter = new CCIPAdapter(
            address(controller),
            router,
            feeToken,
            remoteChainIds,
            remoteControllers, // trusted remotes: remote CONTROLLER per lane (may be zero, see above)
            selectorChainIds,
            chainSelectors
        );
        vm.label(address(adapter), "CCIPAdapter");

        printDeployment();
        printDaoActionsRequired();
        printFeeFundingReminder();

        if (!vm.envOr("SIMULATION", false)) {
            writeJsonArtifacts();
        }
    }

    // -------------------------------------------------------------------------
    // Reporting
    // -------------------------------------------------------------------------

    function printDeployment() internal view {
        console.log();
        console.log("Deployed contracts:");
        console.log("- CrossChainController:", address(controller));
        console.log("- CCIPAdapter:          ", address(adapter));
        console.log();
        console.log("Other:");
        console.log("- DAO:                  ", dao);
        console.log("- CCIP Router:          ", router);
    }

    /// @dev Prints every follow-up action a human/DAO proposal must execute.
    ///      Every line that names a lane-specific address is prefixed with
    ///      whether that value is the remote CONTROLLER or the remote
    ///      ADAPTER -- confusing the two is the #1 footgun of this design.
    function printDaoActionsRequired() internal view {
        console.log();
        console.log("=== DAO actions still required ===");

        console.log();
        console.log("--- Permissions (grant via the DAO's PermissionManager) ---");

        _printGrant(
            "EXECUTE_PERMISSION",
            dao, // where
            address(controller), // who
            EXECUTE_PERMISSION_ID,
            "controller (WHO) may execute DAO actions decoded from inbound cross-chain messages"
        );
        _printGrant(
            "FORWARD_MESSAGE_PERMISSION",
            address(controller), // where
            dao, // who
            controller.FORWARD_MESSAGE_PERMISSION_ID(),
            "the DAO, or its governance plugin (WHO), may call controller.forwardMessage"
        );
        _printGrant(
            "UPDATE_CONFIG_PERMISSION",
            address(controller), // where
            dao, // who
            controller.UPDATE_CONFIG_PERMISSION_ID(),
            "DAO ONLY (WHO) -- effectively root on the DAO via delegatecall, see CrossChainController's security note. NEVER grant to an EOA."
        );
        _printGrant(
            "RETRY_MESSAGE_PERMISSION",
            address(controller), // where
            dao, // who
            controller.RETRY_MESSAGE_PERMISSION_ID(),
            "the DAO (WHO) may retry a previously failed inbound message"
        );
        _printGrant(
            "SWEEP_PERMISSION",
            address(controller), // where
            dao, // who
            controller.SWEEP_PERMISSION_ID(),
            "the DAO (WHO) may move pre-funded fee assets out of the controller"
        );
        _printGrant(
            "UPDATE_ADAPTER_CONFIG_PERMISSION",
            address(adapter), // where
            dao, // who
            adapter.UPDATE_ADAPTER_CONFIG_PERMISSION_ID(),
            "the DAO (WHO) may update the adapter's trusted remotes / chain selectors"
        );

        console.log();
        console.log("--- Lane configuration (controller.updateConfig) ---");
        console.log("Requires UPDATE_CONFIG_PERMISSION on the controller, granted to the DAO above.");
        console.log("Function: updateConfig(uint256[] chainIds, ChainConfig[] configs)");
        console.log("ChainConfig = { address localAdapter; address remoteAdapter; uint64 bridgeChainId; }");

        bool anyReady = false;
        for (uint256 i = 0; i < remoteChainIds.length; i++) {
            bool ready = remoteControllers[i] != address(0) && remoteAdapters[i] != address(0);
            if (ready) anyReady = true;

            console.log();
            console.log("  chainId:       ", remoteChainIds[i]);
            console.log("  localAdapter:  ", address(adapter), "(THIS chain's ADAPTER)");
            console.log(
                "  remoteAdapter: ",
                remoteAdapters[i],
                "(remote chain's ADAPTER -- the CCIP receiver, NOT the remote controller)"
            );
            console.log("  bridgeChainId: ", uint256(CCIPChains.selectorOf(remoteChainIds[i])), "(CCIP selector)");

            if (!ready) {
                console.log();
                console.log(
                    "  !! LANE NOT USABLE UNTIL PHASE 2 !! remoteController or remoteAdapter is still zero for chainId",
                    remoteChainIds[i]
                );
                console.log(
                    "     remoteController currently:", remoteControllers[i], "(zero means unknown/not deployed yet)"
                );
                console.log(
                    "     remoteAdapter currently:    ", remoteAdapters[i], "(zero means unknown/not deployed yet)"
                );
                console.log(
                    "     Once the remote pair is deployed, a DAO proposal must call BOTH:"
                );
                console.log(
                    "       1) controller.updateConfig([", remoteChainIds[i], "], [ChainConfig{localAdapter: <this adapter>, remoteAdapter: <REMOTE ADAPTER>, bridgeChainId: <selector above>}])"
                );
                console.log(
                    "       2) adapter.setTrustedRemotes([", remoteChainIds[i], "], [<REMOTE CONTROLLER, NOT the remote adapter>])"
                );
            }
        }

        if (remoteChainIds.length == 0) {
            console.log();
            console.log("  (no remote lanes supplied -- REMOTE_CHAIN_IDS was empty)");
        } else if (anyReady) {
            console.log();
            console.log(
                "  NOTE: for lanes already fully known above, a single updateConfig call batching all of them is sufficient."
            );
        }

        console.log();
        console.log(
            "Trusted remotes for lanes whose remoteController was already known were set at CONSTRUCTION TIME"
        );
        console.log(
            "(CCIPAdapter's constructor forwards REMOTE_CONTROLLERS into setTrustedRemotes) -- no separate action needed for those."
        );
    }

    function _printGrant(
        string memory permissionName,
        address where,
        address who,
        bytes32 permissionId,
        string memory note
    ) internal pure {
        console.log();
        console.log(string.concat("DAO action: Grant ", permissionName));
        console.log("- Function:     grant(address where, address who, bytes32 permissionId)");
        console.log("  where:       ", where);
        console.log("  who:         ", who);
        console.log("  permissionId:", vm.toString(permissionId));
        console.log(" ", note);
    }

    function printFeeFundingReminder() internal view {
        console.log();
        console.log("=== Fee funding reminder ===");
        console.log(
            "The CONTROLLER pays bridge fees directly out of its own balance (send is a delegatecall,"
        );
        console.log(
            "so the CCIP Router sees and charges the controller, never the adapter). It must hold:"
        );
        if (feeToken == address(0)) {
            console.log("  - native currency, at address:", address(controller));
        } else {
            console.log("  - the ERC20 fee token", feeToken, "at address:", address(controller));
        }
        console.log(
            "Top it up ahead of any send; a quote taken at proposal-creation time can be stale by execution."
        );
    }

    function writeJsonArtifacts() internal {
        string memory artifacts = "output";
        artifacts.serialize("dao", dao);
        artifacts.serialize("controller", address(controller));
        artifacts.serialize("adapter", address(adapter));
        artifacts.serialize("router", router);
        artifacts.serialize("feeToken", feeToken);
        artifacts.serialize("remoteChainIds", remoteChainIds);
        artifacts.serialize("remoteControllers", remoteControllers);
        artifacts = artifacts.serialize("remoteAdapters", remoteAdapters);

        // `vm.createDir(_, true)` is recursive and idempotent.
        vm.createDir("./deployments", true);
        string memory networkName = vm.envOr("NETWORK_NAME", string("local"));
        string memory filePath = string.concat(
            vm.projectRoot(),
            "/deployments/",
            networkName,
            "-crosschain-",
            vm.toString(block.timestamp),
            ".json"
        );
        artifacts.write(filePath);

        console.log();
        console.log("Artifacts written to", filePath);
    }
}
