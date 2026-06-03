// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, console} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/dao/IDAO.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MemberRegistry} from "../../../../src/framework/member/MemberRegistry.sol";
import {IMemberRegistry} from "../../../../src/framework/member/IMemberRegistry.sol";
import {IResolver} from "../../../../src/framework/utils/ens/IResolver.sol";
import {ENSDomain} from "../../../../src/framework/utils/ens/ENSDomain.sol";

/// @notice Simulates unwrapping a domain and then registering a member.
/// @dev Run with: just test-fork --match-contract RegisterSimulation
contract RegisterSimulationTest is Test {
    ENS constant ENS_REGISTRY = ENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
    address constant PUBLIC_RESOLVER = 0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63;
    address constant NAME_WRAPPER = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;

    address managementDao;
    MemberRegistry registry;

    string parentDomain;
    bytes32 parentNode;
    address domainHolder;
    address randomUser = address(0xBEEF);

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"));

        managementDao = vm.envAddress("MANAGEMENT_DAO_ADDRESS");
        parentDomain = vm.envOr("PARENT_DOMAIN", string("aragonx.eth"));
        parentNode = ENSDomain.namehash(parentDomain);

        address ensOwner = ENS_REGISTRY.owner(parentNode);
        bool isWrapped = ensOwner == NAME_WRAPPER;

        console.log("=== Initial state ===");
        console.log("Domain:        ", parentDomain);
        console.log("ENS owner:     ", ensOwner);
        console.log("Is wrapped:    ", isWrapped);

        if (isWrapped) {
            // Look up the domain holder in the NameWrapper and unwrap
            (, bytes memory data) =
                NAME_WRAPPER.staticcall(abi.encodeWithSignature("ownerOf(uint256)", uint256(parentNode)));
            domainHolder = abi.decode(data, (address));
            console.log("Domain holder: ", domainHolder);
            console.log();

            (string memory label,) = ENSDomain.splitDomain(parentDomain);
            bytes32 labelHash = keccak256(bytes(label));

            console.log("Step 1: Unwrapping", parentDomain);
            vm.prank(domainHolder);
            (bool unwrapOk,) = NAME_WRAPPER.call(
                abi.encodeWithSignature("unwrapETH2LD(bytes32,address,address)", labelHash, domainHolder, domainHolder)
            );
            assertTrue(unwrapOk, "unwrap failed");

            ensOwner = ENS_REGISTRY.owner(parentNode);
            console.log("  ENS owner after unwrap:", ensOwner);
        } else {
            // Already unwrapped — the ENS owner is the domain holder
            domainHolder = ensOwner;
            console.log("Domain holder: ", domainHolder, "(already unwrapped)");
        }
        console.log();

        // --- Step 2: Deploy registry ---

        console.log("Step 2: Deploying registry");
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
        console.log("  Registry:", address(registry));
        console.log();

        // --- Step 3: Domain holder approves registry as ENS operator ---

        console.log("Step 3: Domain holder approves registry as operator");
        vm.prank(domainHolder);
        ENS_REGISTRY.setApprovalForAll(address(registry), true);
        console.log("  Approved:", ENS_REGISTRY.isApprovedForAll(domainHolder, address(registry)));
        console.log();

        // --- Step 4: DAO grants EVICT_SUBDOMAIN_PERMISSION ---

        bytes32 evictPermId = registry.EVICT_SUBDOMAIN_PERMISSION_ID();
        vm.prank(managementDao);
        (bool grantOk,) = managementDao.call(
            abi.encodeWithSignature("grant(address,address,bytes32)", address(registry), managementDao, evictPermId)
        );
        assertTrue(grantOk, "grant EVICT_SUBDOMAIN_PERMISSION failed");
        console.log("Step 4: Granted EVICT_SUBDOMAIN_PERMISSION");
        console.log();
    }

    function test_register_afterUnwrap() public {
        console.log("=== Random user registers potato123456 ===");

        vm.prank(randomUser);
        registry.register("potato123456");

        assertTrue(registry.isRegistered(randomUser));
        assertEq(registry.memberSubdomain(randomUser), "potato123456");

        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256("potato123456")));
        assertEq(ENS_REGISTRY.owner(subnode), address(registry));
        assertTrue(IResolver(PUBLIC_RESOLVER).isApprovedFor(address(registry), subnode, randomUser));

        console.log("  Registered:      true");
        console.log("  Subdomain:       potato123456");
        console.log("  Subnode owner:  ", ENS_REGISTRY.owner(subnode));
        console.log("  Resolver approval: true");
    }

    function test_resolverRecords_afterUnwrap() public {
        vm.prank(randomUser);
        registry.register("potato123456");

        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256("potato123456")));
        console.log("=== Member manages resolver records ===");

        // addr record was set by the registry during register()
        (bool ok, bytes memory data) = PUBLIC_RESOLVER.staticcall(abi.encodeWithSignature("addr(bytes32)", subnode));
        assertTrue(ok);
        address resolvedAddr = abi.decode(data, (address));
        assertEq(resolvedAddr, randomUser);
        console.log("  addr:        ", resolvedAddr, "(set by registry)");

        // setText -- avatar
        vm.prank(randomUser);
        (ok,) = PUBLIC_RESOLVER.call(
            abi.encodeWithSignature(
                "setText(bytes32,string,string)", subnode, "avatar", "https://example.com/potato.png"
            )
        );
        assertTrue(ok, "setText avatar failed");

        (ok, data) = PUBLIC_RESOLVER.staticcall(abi.encodeWithSignature("text(bytes32,string)", subnode, "avatar"));
        assertTrue(ok);
        string memory avatar = abi.decode(data, (string));
        assertEq(avatar, "https://example.com/potato.png");
        console.log("  avatar:       set and verified");

        // setText -- description
        vm.prank(randomUser);
        (ok,) = PUBLIC_RESOLVER.call(
            abi.encodeWithSignature("setText(bytes32,string,string)", subnode, "description", "I am a potato")
        );
        assertTrue(ok, "setText description failed");

        (ok, data) = PUBLIC_RESOLVER.staticcall(abi.encodeWithSignature("text(bytes32,string)", subnode, "description"));
        assertTrue(ok);
        assertEq(abi.decode(data, (string)), "I am a potato");
        console.log("  description:  set and verified");

        // setText -- url
        vm.prank(randomUser);
        (ok,) = PUBLIC_RESOLVER.call(
            abi.encodeWithSignature("setText(bytes32,string,string)", subnode, "url", "https://potato.xyz")
        );
        assertTrue(ok, "setText url failed");

        (ok, data) = PUBLIC_RESOLVER.staticcall(abi.encodeWithSignature("text(bytes32,string)", subnode, "url"));
        assertTrue(ok);
        assertEq(abi.decode(data, (string)), "https://potato.xyz");
        console.log("  url:          set and verified");

        // setAddr (coinType 60 = ETH) -- member can update their own addr
        vm.prank(randomUser);
        (ok,) = PUBLIC_RESOLVER.call(abi.encodeWithSignature("setAddr(bytes32,address)", subnode, randomUser));
        assertTrue(ok, "setAddr failed");
        console.log("  setAddr:      set and verified");

        // setContenthash
        bytes memory contenthash = hex"e3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f";
        vm.prank(randomUser);
        (ok,) = PUBLIC_RESOLVER.call(abi.encodeWithSignature("setContenthash(bytes32,bytes)", subnode, contenthash));
        assertTrue(ok, "setContenthash failed");

        (ok, data) = PUBLIC_RESOLVER.staticcall(abi.encodeWithSignature("contenthash(bytes32)", subnode));
        assertTrue(ok);
        assertEq(abi.decode(data, (bytes)), contenthash);
        console.log("  contenthash:  set and verified");

        // Another user CANNOT set records on this subnode
        address attacker = address(0xBAD);
        vm.prank(attacker);
        (ok,) = PUBLIC_RESOLVER.call(
            abi.encodeWithSignature("setText(bytes32,string,string)", subnode, "avatar", "hacked")
        );
        assertFalse(ok, "attacker should not be able to setText");
        console.log("  attacker:     correctly rejected");
    }

    function test_fullCycle_afterUnwrap() public {
        vm.prank(randomUser);
        registry.register("potato123456");

        vm.prank(randomUser);
        registry.move("spud");
        assertEq(registry.memberSubdomain(randomUser), "spud");

        vm.prank(randomUser);
        registry.release();
        assertFalse(registry.isRegistered(randomUser));

        console.log("  Full cycle (register, move, release) succeeded");
    }

    function test_evict_afterUnwrap() public {
        vm.prank(randomUser);
        registry.register("potato123456");

        vm.prank(managementDao);
        registry.evict("potato123456", address(0));

        assertFalse(registry.isRegistered(randomUser));
        console.log("  Evict succeeded");
    }
}
