// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {
    DaoAuthorizableUpgradeable
} from "@aragon/osx-commons-contracts/src/permission/auth/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {isSubdomainValid} from "@aragon/osx/framework/utils/RegistryUtils.sol";

import {IMemberRegistry} from "./IMemberRegistry.sol";
import {IResolver} from "./IResolver.sol";

/// @title MemberRegistry
/// @author Aragon X - 2026
/// @notice Permissionless member self-registration via ENS subdomain claims. Owns the parent
/// ENS node, manages subdomain lifecycle (claim, release, rename), and grants per-node
/// resolver approval so members can manage their own ENS records natively.
/// @dev The ENS registry and resolver are trusted, known mainnet contracts. No reentrancy
/// guard is needed — the contract is the sole caller of its own ENS operations.
/// @custom:security-contact sirt@aragon.org
contract MemberRegistry is IMemberRegistry, UUPSUpgradeable, DaoAuthorizableUpgradeable, ProtocolVersion {
    /// @notice The ID of the permission required to call `_authorizeUpgrade`.
    bytes32 public constant UPGRADE_REGISTRY_PERMISSION_ID = keccak256("UPGRADE_REGISTRY_PERMISSION");

    /// @notice The ID of the permission required to call `revoke`.
    bytes32 public constant REVOKE_MEMBER_PERMISSION_ID = keccak256("REVOKE_MEMBER_PERMISSION");

    // State

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

    // Lifecycle

    /// @dev Disallow initializing the implementation contract.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the registry.
    /// @param _managementDao The DAO management permissions.
    /// @param _ens The ENS registry contract.
    /// @param _node The namehash of the parent domain this registry manages.
    /// @param _resolver The resolver address. Must support per-node `approve()`.
    function initialize(IDAO _managementDao, ENS _ens, bytes32 _node, address _resolver) external initializer {
        __DaoAuthorizableUpgradeable_init(_managementDao);

        // Verify the ENS registry is valid (root node must have an owner).
        if (_ens.owner(bytes32(0)) == address(0)) revert InvalidENSRegistry(address(_ens));
        // Verify the parent node is not empty.
        else if (_node == bytes32(0)) revert InvalidNode();

        // Verify the resolver supports per-node approval (reverts if missing).
        IResolver(_resolver).isApprovedFor(address(this), bytes32(0), address(0));

        ens = _ens;
        node = _node;
        resolver = _resolver;
    }

    // External functions

    // External functions
    //
    // All functions follow Checks-Effects-Interactions (CEI): state is written before
    // external ENS calls. This prevents reentrancy attacks where a malicious resolver
    // could reenter register() with the same label from a different sender, bypassing
    // the labelOwner collision check while state is still unwritten.

    /// @inheritdoc IMemberRegistry
    function register(string calldata subdomain) external {
        _validateSubdomain(subdomain);

        bytes32 label = keccak256(bytes(subdomain));

        if (memberLabel[msg.sender] != bytes32(0)) revert AlreadyRegistered(msg.sender);
        else if (labelOwner[label] != address(0)) revert SubdomainAlreadyTaken(subdomain);

        memberLabel[msg.sender] = label;
        memberSubdomain[msg.sender] = subdomain;
        labelOwner[label] = msg.sender;

        _assignSubnode(msg.sender, label);

        emit MemberRegistered(msg.sender, subdomain);
    }

    /// @inheritdoc IMemberRegistry
    function release() external {
        if (memberLabel[msg.sender] == bytes32(0)) revert NotRegistered(msg.sender);

        bytes32 label = memberLabel[msg.sender];
        string memory subdomain = memberSubdomain[msg.sender];

        delete memberLabel[msg.sender];
        delete memberSubdomain[msg.sender];
        delete labelOwner[label];

        _releaseSubnode(msg.sender, label);

        emit MemberReleased(msg.sender, subdomain);
    }

    /// @inheritdoc IMemberRegistry
    function revoke(address member) external auth(REVOKE_MEMBER_PERMISSION_ID) {
        if (memberLabel[member] == bytes32(0)) revert NotRegistered(member);

        bytes32 label = memberLabel[member];
        string memory subdomain = memberSubdomain[member];

        delete memberLabel[member];
        delete memberSubdomain[member];
        delete labelOwner[label];

        _releaseSubnode(member, label);

        emit MemberRevoked(member, msg.sender, subdomain);
    }

    /// @inheritdoc IMemberRegistry
    function rename(string calldata newSubdomain) external {
        _validateSubdomain(newSubdomain);

        if (memberLabel[msg.sender] == bytes32(0)) revert NotRegistered(msg.sender);

        bytes32 newLabel = keccak256(bytes(newSubdomain));
        if (labelOwner[newLabel] != address(0)) revert SubdomainAlreadyTaken(newSubdomain);

        bytes32 oldLabel = memberLabel[msg.sender];
        string memory oldSubdomain = memberSubdomain[msg.sender];

        delete labelOwner[oldLabel];
        memberLabel[msg.sender] = newLabel;
        memberSubdomain[msg.sender] = newSubdomain;
        labelOwner[newLabel] = msg.sender;

        _releaseSubnode(msg.sender, oldLabel);
        _assignSubnode(msg.sender, newLabel);

        emit MemberRenamed(msg.sender, oldSubdomain, newSubdomain);
    }

    // Views

    /// @notice Returns true if the member has a registered subdomain.
    function isRegistered(address member) external view returns (bool) {
        return memberLabel[member] != bytes32(0);
    }

    // Internal

    uint256 internal constant MAX_SUBDOMAIN_LENGTH = 50;

    /// @dev Validates the subdomain: non-empty, max 50 chars, only [0-9a-z-].
    function _validateSubdomain(string calldata subdomain) internal pure {
        uint256 len = bytes(subdomain).length;
        if (len == 0 || len > MAX_SUBDOMAIN_LENGTH || !isSubdomainValid(subdomain)) {
            revert InvalidSubdomain(subdomain);
        }
    }

    /// @dev Claims an ENS subnode: set owner, resolver, addr record, and per-node approval.
    function _assignSubnode(address member, bytes32 label) internal {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        ens.setSubnodeOwner(node, label, address(this));
        ens.setResolver(subnode, resolver);
        IResolver(resolver).setAddr(subnode, member);
        IResolver(resolver).approve(subnode, member, true);
    }

    /// @dev Releases an ENS subnode: revoke approval, clear records, zero addr, release node.
    /// @dev setAddr(address(0)) is intentionally kept after clearRecords — clearRecords bumps the
    /// resolver version counter (invalidating all records), but zeroing addr explicitly ensures no
    /// stale forward resolution regardless of resolver implementation details.
    function _releaseSubnode(address member, bytes32 label) internal {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        IResolver(resolver).approve(subnode, member, false);
        IResolver(resolver).clearRecords(subnode);
        IResolver(resolver).setAddr(subnode, address(0));
        ens.setSubnodeOwner(node, label, address(0));
    }

    /// @notice Authorizes UUPS upgrades. Caller must have `UPGRADE_REGISTRY_PERMISSION_ID`.
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_REGISTRY_PERMISSION_ID) {}

    /// @notice Reserved storage gap for future upgrades.
    uint256[44] private __gap;
}
