// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

/// @title IResolver
/// @notice Minimal resolver interface for MemberSubdomainRegistrar.
/// Covers only what the registrar calls: setAddr, approve, clearRecords, isApprovedFor.
/// Members call the full PublicResolver directly for text records, contenthash, etc.
/// @custom:security-contact sirt@aragon.org
interface IResolver {
    /// @notice Set the address record for a node.
    function setAddr(bytes32 node, address addr) external;

    /// @notice Approve a delegate to manage resolver records for a specific node.
    /// @dev Per-node delegation. Available in ens-contracts >= v0.0.19.
    function approve(bytes32 node, address delegate, bool approved) external;

    /// @notice Invalidate all resolver records for a node by incrementing the version counter.
    function clearRecords(bytes32 node) external;

    /// @notice Check if a delegate is approved for a node by a given owner.
    function isApprovedFor(
        address owner,
        bytes32 node,
        address delegate
    ) external view returns (bool);
}
