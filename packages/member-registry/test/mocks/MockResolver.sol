// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IResolver} from "../../src/IResolver.sol";

/// @notice Minimal in-memory resolver mock for unit tests.
/// Looks up node ownership from an ENS registry — same as the real PublicResolver.
/// Tracks addr records, per-node approvals, text records, and record versions.
contract MockResolver is IResolver {
    ENS public immutable ens;

    // addr records, keyed by (version, node)
    mapping(uint64 => mapping(bytes32 => address)) private _addrs;

    // per-node approval: owner => node => delegate => approved
    mapping(address => mapping(bytes32 => mapping(address => bool))) private _approvals;

    // text records, keyed by (version, node, key)
    mapping(uint64 => mapping(bytes32 => mapping(string => string))) private _texts;

    // record version counter per node
    mapping(bytes32 => uint64) private _versions;

    constructor(ENS _ens) {
        ens = _ens;
    }

    // --- IResolver ---

    function setAddr(bytes32 node, address _addr) external {
        _requireAuthorised(node);
        _addrs[_versions[node]][node] = _addr;
    }

    function approve(bytes32 node, address delegate, bool approved) external {
        // Only the node owner can grant/revoke approval (same as real PublicResolver).
        require(msg.sender == ens.owner(node), "MockResolver: not node owner");
        _approvals[msg.sender][node][delegate] = approved;
    }

    function clearRecords(bytes32 node) external {
        _requireAuthorised(node);
        _versions[node]++;
    }

    function isApprovedFor(
        address owner,
        bytes32 node,
        address delegate
    ) external view returns (bool) {
        return _approvals[owner][node][delegate];
    }

    // --- Text record support (for testing delegation) ---

    function setText(bytes32 node, string calldata key, string calldata value) external {
        _requireAuthorised(node);
        _texts[_versions[node]][node][key] = value;
    }

    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return _texts[_versions[node]][node][key];
    }

    // --- View helpers ---

    function addr(bytes32 node) external view returns (address) {
        return _addrs[_versions[node]][node];
    }

    function version(bytes32 node) external view returns (uint64) {
        return _versions[node];
    }

    // --- Internal ---

    function _requireAuthorised(bytes32 node) internal view {
        address owner = ens.owner(node);
        if (msg.sender == owner) return;
        if (_approvals[owner][node][msg.sender]) return;
        revert("MockResolver: not authorised");
    }
}
