// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

/// @title IMemberRegistry
/// @notice Permissionless member self-registration via ENS subdomain claims.
/// Members claim a subdomain under a configurable parent domain, manage their own
/// resolver records (text, avatar, etc.) via per-node approval, and can release or
/// move their subdomain at any time.
/// @custom:security-contact sirt@aragon.org
interface IMemberRegistry {
    /// @notice A key-value pair for an ENS text record.
    struct TextRecord {
        string key;
        string value;
    }

    /// @notice A bundle of ENS resolver records to set atomically during register or move.
    /// @param textRecords Text records to set (avatar, description, url, etc.)
    /// @param addr The address record. Use address(0) to default to msg.sender.
    /// @param contenthash The contenthash (IPFS, Swarm, etc.). Empty bytes = don't set.
    struct Records {
        TextRecord[] textRecords;
        address addr;
        bytes contenthash;
    }

    /// @notice Emitted when a member registers and claims a subdomain.
    event Registered(address indexed member, string subdomain);

    /// @notice Emitted when a member voluntarily releases their subdomain.
    event Released(address indexed member, string subdomain);

    /// @notice Emitted when governance forcibly evicts a member's subdomain.
    event SubdomainEvicted(address indexed member, address indexed evictor, string subdomain);

    /// @notice Emitted when a member moves their subdomain (release old + claim new).
    event ProfileMoved(address indexed member, string oldSubdomain, string newSubdomain);

    /// @notice Thrown if the subdomain is invalid: shorter than 3 characters, longer than 50,
    ///         starts or ends with `-`, or contains characters outside [0-9a-z-].
    error InvalidSubdomain(string subdomain);

    /// @notice Thrown if the member is already registered.
    error AlreadyRegistered(address member);

    /// @notice Thrown if the member is not registered.
    error NotRegistered(address member);

    /// @notice Thrown if the requested subdomain label is already taken.
    error SubdomainAlreadyTaken(string subdomain);

    /// @notice Thrown if the subdomain has no current owner (evict target unknown).
    error SubdomainNotRegistered(string subdomain);

    /// @notice Thrown if the new controller passed to `evict` already controls the subdomain
    ///         being evicted (no-op transfer is rejected to surface caller mistakes).
    error InvalidNewController(address newController);

    /// @notice Thrown if the ENS registry address is not a valid ENS registry.
    error InvalidENSRegistry(address ens);

    /// @notice Thrown if the parent domain is empty.
    error InvalidDomain(string domain);

    /// @notice Thrown if the management DAO address is the zero address.
    error InvalidManagementDao(address dao);

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

    /// @notice Forcibly evict a subdomain, optionally re-assigning it to a new controller. Governed.
    ///         Requires EVICT_SUBDOMAIN_PERMISSION_ID on this contract (OSx permission system).
    ///         If `newController` is the zero address, the subdomain is fully released (records
    ///         cleared, subnode released). If `newController` is non-zero, the same subdomain is
    ///         re-assigned to it as if it had called `register` itself: ENS subnode re-created,
    ///         addr record set to `newController`, per-node resolver approval granted to it.
    ///         Reverts if the subdomain is unknown, if `newController` already controls it, or
    ///         if `newController` is already registered with a different subdomain.
    /// @param subdomain The subdomain label to evict (e.g., "alice").
    /// @param newController Address that should control the subdomain after the eviction, or
    ///         `address(0)` to release without reassignment.
    function evict(string calldata subdomain, address newController) external;

    /// @notice Move your subdomain. Releases the old label and claims the new one atomically.
    ///         Only moves the caller's own subdomain. Reverts if not registered or new label taken.
    /// @param newSubdomain The new subdomain label to claim.
    function move(string calldata newSubdomain) external;

    /// @notice Move your subdomain and carry over resolver records atomically.
    ///         Only moves the caller's own subdomain. Reverts if not registered or new label taken.
    /// @param newSubdomain The new subdomain label to claim.
    /// @param records Resolver records to set on the new subnode (text, addr, contenthash).
    ///         addr=address(0) keeps the default (msg.sender). Empty contenthash is skipped.
    function move(string calldata newSubdomain, Records calldata records) external;

    /// @notice The parent domain string this registry manages (e.g., `"members.dao.eth"`).
    ///         Pre-image of `parentNode()`.
    function parentDomain() external view returns (string memory);

    /// @notice The namehash of the parent domain. Equal to `namehash(parentDomain())`.
    function parentNode() external view returns (bytes32);

    /// @notice Returns true if `member` has a registered subdomain.
    function isRegistered(address member) external view returns (bool);
}
