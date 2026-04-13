// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {DaoAuthorizableUpgradeable} from "@aragon/osx-commons-contracts/src/permission/auth/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

import {IResolver} from "./IResolver.sol";

/// @title MemberSubdomainRegistrar
/// @author Aragon X - 2026
/// @notice ENS operator for member subdomains. Owns the parent ENS node, manages subdomain
/// lifecycle (claim, release, rename), and grants per-node resolver approval so members can
/// manage their own ENS records natively.
/// @dev All state-modifying functions are gated by `REGISTER_SUBDOMAIN_PERMISSION_ID`.
/// Only the MemberRegistry contract should hold this permission.
/// The ENS registry and resolver are trusted, known contracts — no reentrancy guard needed.
/// @custom:security-contact sirt@aragon.org
contract MemberSubdomainRegistrar is UUPSUpgradeable, DaoAuthorizableUpgradeable, ProtocolVersion {
    /// @notice The ID of the permission required to call `_authorizeUpgrade`.
    bytes32 public constant UPGRADE_REGISTRAR_PERMISSION_ID =
        keccak256("UPGRADE_REGISTRAR_PERMISSION");

    /// @notice The ID of the permission required to call `registerSubdomain`, `releaseSubdomain`,
    /// and `renameSubdomain`.
    bytes32 public constant REGISTER_SUBDOMAIN_PERMISSION_ID =
        keccak256("REGISTER_SUBDOMAIN_PERMISSION");

    /// @notice The ENS registry contract.
    ENS public ens;

    /// @notice The namehash of the parent domain (e.g., `namehash("members.dao.eth")`).
    bytes32 public node;

    /// @notice The resolver address (must support per-node `approve()`).
    address public resolver;

    /// @notice Maps a member address to its claimed labelhash. `bytes32(0)` means not registered.
    mapping(address => bytes32) public memberLabel;

    /// @notice Maps a member address to its claimed subdomain string (for events and display).
    mapping(address => string) public memberSubdomain;

    /// @notice Maps a labelhash to the member who owns it. `address(0)` means available.
    mapping(bytes32 => address) public labelOwner;

    /// @notice Thrown if the member is already registered.
    error AlreadyRegistered(address member);

    /// @notice Thrown if the member is not registered.
    error NotRegistered(address member);

    /// @notice Thrown if the requested subdomain label is already taken.
    error SubdomainAlreadyTaken(string subdomain);

    /// @dev Disallow initializing the implementation contract.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the registrar.
    /// @param _managingDao The DAO managing permissions.
    /// @param _ens The ENS registry contract.
    /// @param _node The namehash of the parent domain this registrar manages.
    /// @param _resolver The resolver address. Must support per-node `approve()`.
    function initialize(
        IDAO _managingDao,
        ENS _ens,
        bytes32 _node,
        address _resolver
    ) external initializer {
        __DaoAuthorizableUpgradeable_init(_managingDao);

        ens = _ens;
        node = _node;
        resolver = _resolver;

        // Verify the resolver supports per-node approval (reverts if the function is missing).
        IResolver(_resolver).isApprovedFor(address(this), bytes32(0), address(0));
    }

    /// @notice Register a subdomain for a member. Sets ENS records and grants per-node
    /// resolver approval so the member can manage their own records.
    /// @param member The member's address.
    /// @param label The labelhash (`keccak256` of the subdomain string).
    /// @param subdomain The original subdomain string (stored for display and events).
    function registerSubdomain(
        address member,
        bytes32 label,
        string calldata subdomain
    ) external auth(REGISTER_SUBDOMAIN_PERMISSION_ID) {
        if (memberLabel[member] != bytes32(0)) {
            revert AlreadyRegistered(member);
        }
        if (labelOwner[label] != address(0)) {
            revert SubdomainAlreadyTaken(subdomain);
        }

        // State changes
        memberLabel[member] = label;
        memberSubdomain[member] = subdomain;
        labelOwner[label] = member;

        // ENS operations (trusted contracts)
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        ens.setSubnodeOwner(node, label, address(this));
        ens.setResolver(subnode, resolver);
        IResolver(resolver).setAddr(subnode, member);
        IResolver(resolver).approve(subnode, member, true);
    }

    /// @notice Release a member's subdomain. Revokes approval, clears records, releases ENS node.
    /// @param member The member's address.
    /// @return subdomain The released subdomain string (for event emission by the registry).
    function releaseSubdomain(
        address member
    ) external auth(REGISTER_SUBDOMAIN_PERMISSION_ID) returns (string memory subdomain) {
        bytes32 label = memberLabel[member];
        if (label == bytes32(0)) {
            revert NotRegistered(member);
        }

        subdomain = memberSubdomain[member];

        // State changes
        delete memberLabel[member];
        delete memberSubdomain[member];
        delete labelOwner[label];

        // ENS operations (trusted contracts)
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        IResolver(resolver).approve(subnode, member, false);
        IResolver(resolver).clearRecords(subnode);
        IResolver(resolver).setAddr(subnode, address(0));
        ens.setSubnodeOwner(node, label, address(0));
    }

    /// @notice Rename a member's subdomain. Releases old, claims new, atomically.
    /// @param member The member's address.
    /// @param newLabel The new labelhash.
    /// @param newSubdomain The new subdomain string.
    /// @return oldSubdomain The previous subdomain string (for event emission by the registry).
    function renameSubdomain(
        address member,
        bytes32 newLabel,
        string calldata newSubdomain
    ) external auth(REGISTER_SUBDOMAIN_PERMISSION_ID) returns (string memory oldSubdomain) {
        bytes32 oldLabel = memberLabel[member];
        if (oldLabel == bytes32(0)) {
            revert NotRegistered(member);
        }
        if (labelOwner[newLabel] != address(0)) {
            revert SubdomainAlreadyTaken(newSubdomain);
        }

        oldSubdomain = memberSubdomain[member];

        // State changes: release old label, claim new label
        delete labelOwner[oldLabel];
        memberLabel[member] = newLabel;
        memberSubdomain[member] = newSubdomain;
        labelOwner[newLabel] = member;

        // ENS: release old subnode
        bytes32 oldSubnode = keccak256(abi.encodePacked(node, oldLabel));
        IResolver(resolver).approve(oldSubnode, member, false);
        IResolver(resolver).clearRecords(oldSubnode);
        IResolver(resolver).setAddr(oldSubnode, address(0));
        ens.setSubnodeOwner(node, oldLabel, address(0));

        // ENS: claim new subnode
        bytes32 newSubnode = keccak256(abi.encodePacked(node, newLabel));
        ens.setSubnodeOwner(node, newLabel, address(this));
        ens.setResolver(newSubnode, resolver);
        IResolver(resolver).setAddr(newSubnode, member);
        IResolver(resolver).approve(newSubnode, member, true);
    }

    /// @notice Returns true if the member has a registered subdomain.
    function isRegistered(address member) external view returns (bool) {
        return memberLabel[member] != bytes32(0);
    }

    /// @notice Authorizes UUPS upgrades. Caller must have `UPGRADE_REGISTRAR_PERMISSION_ID`.
    function _authorizeUpgrade(
        address
    ) internal virtual override auth(UPGRADE_REGISTRAR_PERMISSION_ID) {}

    /// @notice Reserved storage gap for future upgrades.
    uint256[44] private __gap;
}
