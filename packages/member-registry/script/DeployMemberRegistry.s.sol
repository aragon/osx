// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Script, console2} from "forge-std/Script.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";

import {MemberRegistry} from "../src/MemberRegistry.sol";
import {MemberSubdomainRegistrar} from "../src/MemberSubdomainRegistrar.sol";

/// @notice Deploys MemberRegistry + MemberSubdomainRegistrar behind UUPS proxies.
/// @dev Reads deployment parameters from environment variables:
///   - MANAGING_DAO: the DAO managing permissions
///   - ENS_REGISTRY: the ENS registry address
///   - PARENT_NODE: the namehash of the parent domain (bytes32, hex)
///   - RESOLVER: the PublicResolver address (must support per-node approve)
///
/// After deployment, the DAO must:
///   1. Grant REGISTER_SUBDOMAIN_PERMISSION_ID to the MemberRegistry on the registrar
///   2. Grant REVOKE_MEMBER_PERMISSION_ID to the governance multisig on the registry
///   3. Transfer the parent ENS node to the registrar (see SetupMembersDomain.s.sol)
contract DeployMemberRegistry is Script {
    using ProxyLib for address;

    function run() external {
        address dao = vm.envAddress("MANAGING_DAO");
        address ens = vm.envAddress("ENS_REGISTRY");
        bytes32 node = vm.envBytes32("PARENT_NODE");
        address resolver = vm.envAddress("RESOLVER");

        vm.startBroadcast();

        // 1. Deploy registrar implementation + proxy
        MemberSubdomainRegistrar registrarImpl = new MemberSubdomainRegistrar();
        MemberSubdomainRegistrar registrar = MemberSubdomainRegistrar(
            address(registrarImpl).deployUUPSProxy(
                abi.encodeCall(
                    MemberSubdomainRegistrar.initialize,
                    (IDAO(dao), ENS(ens), node, resolver)
                )
            )
        );
        console2.log("MemberSubdomainRegistrar impl:", address(registrarImpl));
        console2.log("MemberSubdomainRegistrar proxy:", address(registrar));

        // 2. Deploy registry implementation + proxy
        MemberRegistry registryImpl = new MemberRegistry();
        MemberRegistry registry = MemberRegistry(
            address(registryImpl).deployUUPSProxy(
                abi.encodeCall(
                    MemberRegistry.initialize,
                    (IDAO(dao), registrar)
                )
            )
        );
        console2.log("MemberRegistry impl:", address(registryImpl));
        console2.log("MemberRegistry proxy:", address(registry));

        vm.stopBroadcast();

        // Log the permission grants needed (executed separately via DAO proposal)
        console2.log("");
        console2.log("--- Required DAO actions ---");
        console2.log("1. Grant REGISTER_SUBDOMAIN_PERMISSION_ID on registrar to registry");
        console2.log("   where:", address(registrar));
        console2.log("   who:", address(registry));
        console2.log("   permissionId:", vm.toString(registrar.REGISTER_SUBDOMAIN_PERMISSION_ID()));
        console2.log("2. Grant REVOKE_MEMBER_PERMISSION_ID on registry to governance multisig");
        console2.log("   where:", address(registry));
        console2.log("   permissionId:", vm.toString(registry.REVOKE_MEMBER_PERMISSION_ID()));
    }
}
