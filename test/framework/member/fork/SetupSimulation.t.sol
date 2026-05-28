// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, console} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MemberRegistry} from "../../../../src/framework/member/MemberRegistry.sol";
import {IMemberRegistry} from "../../../../src/framework/member/IMemberRegistry.sol";
import {IResolver} from "../../../../src/framework/utils/ens/IResolver.sol";
import {ENSDomain} from "../../../../src/framework/utils/ens/ENSDomain.sol";

/// @notice Simulates the full deployment + governance setup on a mainnet fork using the
/// production "scoped ENS controllership transfer" pattern (setOwner / setSubnodeRecord, not
/// setApprovalForAll). Reads PARENT_DOMAIN and MANAGEMENT_DAO_ADDRESS from env.
/// @dev Run with: just test-fork --match-contract SetupSimulation
contract SetupSimulationTest is Test {
    ENS constant ENS_REGISTRY = ENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
    address constant PUBLIC_RESOLVER = 0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63;
    address constant BASE_REGISTRAR = 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85;

    address managementDao;
    string parentDomain;
    bytes32 parentNode;

    // Pre-setup ENS controller of parentNode (or, for a fresh node, the controller of its
    // parent). After setUp(), ENS controllership of parentNode is transferred to the registry;
    // this address still holds the BaseRegistrar NFT / parent node and therefore retains the
    // ability to reclaim controllership.
    address previousDomainOwner;

    MemberRegistry registry;
    address alice = address(0xa11ce);
    address deployer = address(0xDE9107);

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"));

        managementDao = vm.envAddress("MANAGEMENT_DAO_ADDRESS");
        parentDomain = vm.envOr("PARENT_DOMAIN", string("members.dao.eth"));
        parentNode = ENSDomain.namehash(parentDomain);

        address currentEnsOwner = ENS_REGISTRY.owner(parentNode);

        console.log("Setup simulation");
        console.log("- Parent domain: ", parentDomain);
        console.log("- Parent node:   ", vm.toString(parentNode));
        console.log("- Current owner: ", currentEnsOwner);
        console.log("- Management DAO:", managementDao);
        console.log();

        // --- Step 1: Deploy registry (anyone can do this) ---

        vm.startPrank(deployer);
        registry = MemberRegistry(
            address(
                new ERC1967Proxy(
                    address(new MemberRegistry()),
                    abi.encodeCall(
                        MemberRegistry.initialize, (IDAO(managementDao), ENS_REGISTRY, parentDomain, PUBLIC_RESOLVER)
                    )
                )
            )
        );
        vm.stopPrank();
        console.log("Step 1: Deployed registry at", address(registry));

        // --- Step 2: Hand scoped ENS controllership of parentNode to the registry ---

        if (currentEnsOwner == address(0)) {
            // Fresh node: parent-of-parent controller creates the subnode controlled by the registry.
            (string memory label, string memory parent) = ENSDomain.splitDomain(parentDomain);
            bytes32 parentOfParentNode = ENSDomain.namehash(parent);
            previousDomainOwner = ENS_REGISTRY.owner(parentOfParentNode);

            vm.prank(previousDomainOwner);
            ENS_REGISTRY.setSubnodeRecord(
                parentOfParentNode, keccak256(bytes(label)), address(registry), PUBLIC_RESOLVER, 0
            );
            console.log("Step 2: Created node controlled directly by registry (under", parent, ")");
        } else {
            // Existing node: current controller transfers ENS controllership to the registry.
            previousDomainOwner = currentEnsOwner;
            vm.prank(previousDomainOwner);
            ENS_REGISTRY.setOwner(parentNode, address(registry));
            console.log("Step 2: Transferred ENS controllership from previous controller to registry");
        }
        assertEq(
            ENS_REGISTRY.owner(parentNode),
            address(registry),
            "registry should control parentNode after setup"
        );

        // --- Step 3: DAO grants EVICT_SUBDOMAIN_PERMISSION to itself ---

        bytes32 evictPermId = registry.EVICT_SUBDOMAIN_PERMISSION_ID();
        vm.prank(managementDao);
        (bool grantOk,) = managementDao.call(
            abi.encodeWithSignature("grant(address,address,bytes32)", address(registry), managementDao, evictPermId)
        );
        assertTrue(grantOk, "Step 3: grant EVICT_SUBDOMAIN_PERMISSION failed");
        console.log("Step 3: Granted EVICT_SUBDOMAIN_PERMISSION");
        console.log();
    }

    function test_setup_registerWorks() public {
        vm.prank(alice);
        registry.register("alice");

        assertTrue(registry.isRegistered(alice));
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256("alice")));
        assertEq(ENS_REGISTRY.owner(subnode), address(registry));
        assertTrue(IResolver(PUBLIC_RESOLVER).isApprovedFor(address(registry), subnode, alice));
        console.log("register('alice') succeeded");
    }

    function test_setup_memberCanSetRecords() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256("alice")));
        vm.prank(alice);
        (bool ok,) = PUBLIC_RESOLVER.call(
            abi.encodeWithSignature(
                "setText(bytes32,string,string)", subnode, "avatar", "https://example.com/alice.png"
            )
        );
        assertTrue(ok, "member setText failed");
        console.log("member setText succeeded");
    }

    function test_setup_evictWorks() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(managementDao);
        registry.evict("alice", address(0));

        assertFalse(registry.isRegistered(alice));
        console.log("evict succeeded");
    }

    function test_setup_fullCycle() public {
        vm.prank(alice);
        registry.register("alice");
        assertTrue(registry.isRegistered(alice));

        vm.prank(alice);
        registry.move("alice2");
        assertEq(registry.memberSubdomain(alice), "alice2");

        vm.prank(alice);
        registry.release();
        assertFalse(registry.isRegistered(alice));
        console.log("full cycle succeeded");
    }

    /// @notice The registry is now the ENS controller; the previous holder no longer has direct
    /// ENS-level authority over the parent node (cannot setOwner/setApprovalForAll back).
    function test_setup_previousControllerCannotInterfere() public {
        assertEq(ENS_REGISTRY.owner(parentNode), address(registry));

        // Previous controller cannot reclaim ENS controllership directly via setOwner.
        vm.prank(previousDomainOwner);
        vm.expectRevert();
        ENS_REGISTRY.setOwner(parentNode, previousDomainOwner);

        // register() still works for users.
        vm.prank(alice);
        registry.register("alice");
        assertTrue(registry.isRegistered(alice));
        console.log("previous controller cannot interfere; registry remains in control");
    }

    /// @notice The parent's ENS controller (one level up) remains the kill-switch. For deeper
    /// subdomains they can directly setSubnodeOwner to overwrite. For .eth 2LDs the
    /// equivalent is BaseRegistrar.reclaim from the NFT registrant -- exercised by the
    /// RegisterSimulation suite, not duplicated here.
    function test_setup_parentControllerCanOverrideKillSwitch() public {
        (string memory label, string memory parent) = ENSDomain.splitDomain(parentDomain);
        bytes32 parentOfParentNode = ENSDomain.namehash(parent);
        address parentOfParentController = ENS_REGISTRY.owner(parentOfParentNode);
        bytes32 labelHash = keccak256(bytes(label));

        if (parentOfParentController == BASE_REGISTRAR) {
            console.log("Parent-of-parent is BaseRegistrar (.eth 2LD); reclaim path covered elsewhere.");
            return;
        }

        // Parent-of-parent controller overwrites the subnode's controller.
        vm.prank(parentOfParentController);
        ENS_REGISTRY.setSubnodeOwner(parentOfParentNode, labelHash, parentOfParentController);

        assertEq(ENS_REGISTRY.owner(parentNode), parentOfParentController);

        // After the override, the registry no longer controls parentNode; register() reverts.
        vm.expectRevert();
        vm.prank(alice);
        registry.register("alice");
        console.log("parent-of-parent kill-switch effective");
    }
}
