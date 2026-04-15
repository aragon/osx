// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

/// @title IMemberRegistry
/// @notice Permissionless member self-registration via ENS subdomain claims.
/// Members claim a subdomain under a configurable parent domain, manage their own
/// resolver records (text, avatar, etc.) via per-node approval, and can release or
/// rename their subdomain at any time.
/// @custom:security-contact sirt@aragon.org
interface IMemberRegistry {
    /// @notice A key-value pair for an ENS text record.
    struct TextRecord {
        string key;
        string value;
    }

    /// @notice A bundle of ENS resolver records to set atomically during register or rename.
    /// @param textRecords Text records to set (avatar, description, url, etc.)
    /// @param addr The address record. Use address(0) to default to msg.sender.
    /// @param contenthash The contenthash (IPFS, Swarm, etc.). Empty bytes = don't set.
    struct Records {
        TextRecord[] textRecords;
        address addr;
        bytes contenthash;
    }

    /// @notice Emitted when a member registers and claims a subdomain.
    event MemberRegistered(address indexed member, string subdomain);

    /// @notice Emitted when a member voluntarily releases their subdomain.
    event MemberReleased(address indexed member, string subdomain);

    /// @notice Emitted when governance forcibly revokes a member's subdomain.
    event MemberRevoked(address indexed member, address indexed revoker, string subdomain);

    /// @notice Emitted when a member renames their subdomain (release old + claim new).
    event MemberRenamed(address indexed member, string oldSubdomain, string newSubdomain);

    /// @notice Thrown if the subdomain is invalid: empty, exceeds 50 characters, or
    ///         contains characters outside [0-9a-z-].
    error InvalidSubdomain(string subdomain);

    /// @notice Thrown if the member is already registered.
    error AlreadyRegistered(address member);

    /// @notice Thrown if the member is not registered.
    error NotRegistered(address member);

    /// @notice Thrown if the requested subdomain label is already taken.
    error SubdomainAlreadyTaken(string subdomain);

    /// @notice Thrown if the ENS registry address is not a valid ENS registry.
    error InvalidENSRegistry(address ens);

    /// @notice Thrown if the parent node is empty (bytes32(0)).
    error InvalidNode();

    /// @notice Register as a member by claiming a subdomain. Permissionless.
    ///         One subdomain per address. Reverts if already registered (release first).
    /// @param subdomain The subdomain label to claim (e.g., "alice").
    function register(string calldata subdomain) external;

    /// @notice Register as a member with initial resolver records set atomically. Permissionless.
    ///         One subdomain per address. Reverts if already registered (release first).
    /// @param subdomain The subdomain label to claim (e.g., "alice").
    /// @param records Resolver records to set on the new subnode (text, addr, contenthash).
    ///         addr=address(0) defaults to msg.sender. Empty contenthash is skipped.
    function register(string calldata subdomain, Records calldata records) external;

    /// @notice Voluntarily release your subdomain. Permissionless.
    ///         Only releases the caller's own subdomain. Reverts if not registered.
    function release() external;

    /// @notice Forcibly revoke a member's subdomain. Governed.
    ///         Requires REVOKE_MEMBER_PERMISSION_ID on this contract (OSx permission system).
    /// @param member The address of the member to revoke.
    function revoke(address member) external;

    /// @notice Rename your subdomain. Releases the old label and claims the new one atomically.
    ///         Only renames the caller's own subdomain. Reverts if not registered or new label taken.
    /// @param newSubdomain The new subdomain label to claim.
    function rename(string calldata newSubdomain) external;

    /// @notice Rename your subdomain and carry over resolver records atomically.
    ///         Only renames the caller's own subdomain. Reverts if not registered or new label taken.
    /// @param newSubdomain The new subdomain label to claim.
    /// @param records Resolver records to set on the new subnode (text, addr, contenthash).
    ///         addr=address(0) keeps the default (msg.sender). Empty contenthash is skipped.
    function rename(string calldata newSubdomain, Records calldata records) external;
}
