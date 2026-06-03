// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ProtocolVersion} from "../../common/utils/versioning/ProtocolVersion.sol";
import {
    DaoAuthorizableUpgradeable
} from "../../common/permission/auth/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "../../common/dao/IDAO.sol";
import {isSubdomainValid} from "../utils/RegistryUtils.sol";

import {IMemberRegistry} from "./IMemberRegistry.sol";
import {IResolver} from "../utils/ens/IResolver.sol";
import {ENSDomain} from "../utils/ens/ENSDomain.sol";

/// @title MemberRegistry
/// @author Aragon X - 2026
/// @notice Permissionless member self-registration via ENS subdomain claims. Owns the parent
/// ENS node, manages subdomain lifecycle (claim, release, move), and grants per-node
/// resolver approval so members can manage their own ENS records natively.
/// @dev The ENS registry and resolver are trusted, known mainnet contracts. No reentrancy
/// guard is needed — the contract is the sole caller of its own ENS operations.
/// @custom:security-contact sirt@aragon.org
contract MemberRegistry is IMemberRegistry, UUPSUpgradeable, DaoAuthorizableUpgradeable, ProtocolVersion {
    /// @notice The ID of the permission required to call `_authorizeUpgrade`.
    bytes32 public constant UPGRADE_REGISTRY_PERMISSION_ID = keccak256("UPGRADE_REGISTRY_PERMISSION");

    /// @notice The ID of the permission required to call `evict`.
    bytes32 public constant EVICT_SUBDOMAIN_PERMISSION_ID = keccak256("EVICT_SUBDOMAIN_PERMISSION");

    // State

    /// @notice The ENS registry contract.
    ENS public ens;

    /// @notice The namehash of the parent domain (e.g., `namehash("members.dao.eth")`).
    bytes32 public parentNode;

    /// @notice The parent domain string (e.g., `"members.dao.eth"`). Pre-image of `parentNode`.
    string public parentDomain;

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
    /// @param _domain The parent domain this registry manages (e.g., `"members.dao.eth"`).
    /// @param _resolver The resolver address. Must support per-node `approve()`.
    function initialize(IDAO _managementDao, ENS _ens, string memory _domain, address _resolver) external initializer {
        // Verify the management DAO is not the zero address — without it, no permission
        // checks (revoke, upgrade) can ever succeed.
        if (address(_managementDao) == address(0)) revert InvalidManagementDao(address(_managementDao));

        __DaoAuthorizableUpgradeable_init(_managementDao);

        // Verify the ENS registry is valid (root node must have an owner).
        if (_ens.owner(bytes32(0)) == address(0)) revert InvalidENSRegistry(address(_ens));
        // Verify the parent domain is not empty.
        else if (bytes(_domain).length == 0) revert InvalidDomain(_domain);

        // Reject zero address / EOA resolvers. High-level calls to a no-code address
        if (_resolver.code.length == 0) revert InvalidResolver(_resolver);

        // Verify the resolver supports per-node approval (reverts if missing).
        IResolver(_resolver).isApprovedFor(address(this), bytes32(0), address(0));

        ens = _ens;
        parentDomain = _domain;
        parentNode = ENSDomain.namehash(_domain);
        resolver = _resolver;
    }

    // External functions

    /// @inheritdoc IMemberRegistry
    function register(string calldata subdomain) external {
        bytes32 label = _register(subdomain, msg.sender);
        _setResolverAddr(label, msg.sender);
        emit Registered(msg.sender, subdomain);
    }

    /// @inheritdoc IMemberRegistry
    function register(string calldata subdomain, Records calldata records) external {
        bytes32 label = _register(subdomain, msg.sender);
        _applyRecords(label, records);
        emit Registered(msg.sender, subdomain);
    }

    /// @inheritdoc IMemberRegistry
    function release() external {
        string memory subdomain = _release(msg.sender);
        emit Released(msg.sender, subdomain);
    }

    /// @inheritdoc IMemberRegistry
    function evict(string calldata subdomain, address newController) external auth(EVICT_SUBDOMAIN_PERMISSION_ID) {
        bytes32 label = keccak256(bytes(subdomain));
        address member = labelOwner[label];
        if (member == address(0)) revert SubdomainNotRegistered(subdomain);
        if (newController == member || newController == address(this)) revert InvalidNewController(newController);

        _release(member);
        emit SubdomainEvicted(member, msg.sender, subdomain);

        if (newController == address(0)) return;

        // Re-assign the same subdomain to the new controller. Goes through `_register` so the
        // AlreadyRegistered guard and subdomain validation apply uniformly with `register()`.
        _register(subdomain, newController);
        _setResolverAddr(label, newController);
        emit Registered(newController, subdomain);
    }

    /// @inheritdoc IMemberRegistry
    function move(string calldata newSubdomain) external {
        (bytes32 newLabel, string memory oldSubdomain) = _move(newSubdomain);
        _setResolverAddr(newLabel, msg.sender);
        emit ProfileMoved(msg.sender, oldSubdomain, newSubdomain);
    }

    /// @inheritdoc IMemberRegistry
    function move(string calldata newSubdomain, Records calldata records) external {
        (bytes32 newLabel, string memory oldSubdomain) = _move(newSubdomain);
        _applyRecords(newLabel, records);
        emit ProfileMoved(msg.sender, oldSubdomain, newSubdomain);
    }

    // Views

    /// @notice Returns true if the member has a registered subdomain.
    function isRegistered(address member) external view returns (bool) {
        return memberLabel[member] != bytes32(0);
    }

    // Internal

    uint256 internal constant MIN_SUBDOMAIN_LENGTH = 3;
    uint256 internal constant MAX_SUBDOMAIN_LENGTH = 50;

    /// @dev Core registration logic. Sets up the subnode for `member` but does NOT set resolver
    /// records. The caller must set records and emit the event after this returns.
    function _register(string calldata subdomain, address member) internal returns (bytes32 label) {
        _requireValidSubdomain(subdomain);

        label = keccak256(bytes(subdomain));

        if (memberLabel[member] != bytes32(0)) revert AlreadyRegistered(member);
        else if (labelOwner[label] != address(0)) revert SubdomainAlreadyTaken(subdomain);

        memberLabel[member] = label;
        memberSubdomain[member] = subdomain;
        labelOwner[label] = member;

        _assignSubnode(member, label);
    }

    /// @dev Core move logic. Sets up the new subnode but does NOT set resolver records.
    /// The caller must set records and emit the event after this returns.
    function _move(string calldata newSubdomain) internal returns (bytes32 newLabel, string memory oldSubdomain) {
        _requireValidSubdomain(newSubdomain);

        if (memberLabel[msg.sender] == bytes32(0)) revert NotRegistered(msg.sender);

        newLabel = keccak256(bytes(newSubdomain));
        if (labelOwner[newLabel] != address(0)) revert SubdomainAlreadyTaken(newSubdomain);

        bytes32 oldLabel = memberLabel[msg.sender];
        oldSubdomain = memberSubdomain[msg.sender];

        delete labelOwner[oldLabel];
        memberLabel[msg.sender] = newLabel;
        memberSubdomain[msg.sender] = newSubdomain;
        labelOwner[newLabel] = msg.sender;

        _releaseSubnode(msg.sender, oldLabel);
        _assignSubnode(msg.sender, newLabel);
    }

    /// @dev Clears member state and releases the ENS subnode. Returns the subdomain string for events.
    function _release(address member) internal returns (string memory subdomain) {
        if (memberLabel[member] == bytes32(0)) revert NotRegistered(member);

        bytes32 label = memberLabel[member];
        subdomain = memberSubdomain[member];

        delete memberLabel[member];
        delete memberSubdomain[member];
        delete labelOwner[label];

        _releaseSubnode(member, label);
    }

    /// @dev Validates the subdomain: 3–50 chars, only [0-9a-z-], no leading or trailing `-`.
    function _requireValidSubdomain(string calldata subdomain) internal pure {
        uint256 len = bytes(subdomain).length;
        if (len < MIN_SUBDOMAIN_LENGTH || len > MAX_SUBDOMAIN_LENGTH) {
            revert InvalidSubdomain(subdomain);
        }
        // Leading/trailing dashes are not allowed
        if (bytes(subdomain)[0] == 0x2d || bytes(subdomain)[len - 1] == 0x2d) {
            revert InvalidSubdomain(subdomain);
        }
        if (!isSubdomainValid(subdomain)) {
            revert InvalidSubdomain(subdomain);
        }
    }

    /// @dev Claims an ENS subnode: set owner, resolver, and per-node approval for the member.
    /// Does not set any resolver records -- the caller handles that via _applyRecords or _setResolverAddr.
    function _assignSubnode(address member, bytes32 label) internal {
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, label));
        ens.setSubnodeOwner(parentNode, label, address(this));
        ens.setResolver(subnode, resolver);
        IResolver(resolver).approve(subnode, member, true);
    }

    /// @dev Releases an ENS subnode: revoke approval, clear records, zero addr, release node.
    /// @dev setAddr(address(0)) is intentionally kept after clearRecords -- clearRecords bumps the
    /// resolver version counter (invalidating all records), but zeroing addr explicitly ensures no
    /// stale forward resolution regardless of resolver implementation details.
    function _releaseSubnode(address member, bytes32 label) internal {
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, label));
        IResolver(resolver).approve(subnode, member, false);
        IResolver(resolver).clearRecords(subnode);
        IResolver(resolver).setAddr(subnode, address(0));
        ens.setSubnodeOwner(parentNode, label, address(0));
    }

    /// @dev Sets the addr record on a subnode.
    function _setResolverAddr(bytes32 label, address addr) internal {
        IResolver(resolver).setAddr(keccak256(abi.encodePacked(parentNode, label)), addr);
    }

    /// @dev Applies resolver records to a subnode: addr, text records, and contenthash.
    /// addr defaults to msg.sender if records.addr is address(0).
    function _applyRecords(bytes32 label, Records calldata records) internal {
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, label));
        IResolver r = IResolver(resolver);

        r.setAddr(subnode, records.addr != address(0) ? records.addr : msg.sender);

        for (uint256 i; i < records.textRecords.length; i++) {
            r.setText(subnode, records.textRecords[i].key, records.textRecords[i].value);
        }

        if (records.contenthash.length > 0) {
            r.setContenthash(subnode, records.contenthash);
        }
    }

    /// @notice Authorizes UUPS upgrades. Caller must have `UPGRADE_REGISTRY_PERMISSION_ID`.
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_REGISTRY_PERMISSION_ID) {}

    /// @notice Reserved storage gap for future upgrades.
    uint256[43] private __gap;
}
