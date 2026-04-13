// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";

/// @notice Minimal in-memory ENS registry mock for unit tests.
contract MockENS is ENS {
    mapping(bytes32 => address) private _owners;
    mapping(bytes32 => address) private _resolvers;
    mapping(bytes32 => uint64) private _ttls;
    mapping(address => mapping(address => bool)) private _operators;

    function setRecord(bytes32 node, address _owner, address _resolver, uint64 _ttl) external {
        _owners[node] = _owner;
        _resolvers[node] = _resolver;
        _ttls[node] = _ttl;
    }

    function setSubnodeRecord(
        bytes32 node,
        bytes32 label,
        address _owner,
        address _resolver,
        uint64 _ttl
    ) external {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        _owners[subnode] = _owner;
        _resolvers[subnode] = _resolver;
        _ttls[subnode] = _ttl;
    }

    function setSubnodeOwner(
        bytes32 node,
        bytes32 label,
        address _owner
    ) external returns (bytes32) {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        _owners[subnode] = _owner;
        emit NewOwner(node, label, _owner);
        return subnode;
    }

    function setResolver(bytes32 node, address _resolver) external {
        _resolvers[node] = _resolver;
        emit NewResolver(node, _resolver);
    }

    function setOwner(bytes32 node, address _owner) external {
        _owners[node] = _owner;
        emit Transfer(node, _owner);
    }

    function setTTL(bytes32 node, uint64 _ttl) external {
        _ttls[node] = _ttl;
        emit NewTTL(node, _ttl);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operators[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function owner(bytes32 node) external view returns (address) {
        return _owners[node];
    }

    function resolver(bytes32 node) external view returns (address) {
        return _resolvers[node];
    }

    function ttl(bytes32 node) external view returns (uint64) {
        return _ttls[node];
    }

    function recordExists(bytes32 node) external view returns (bool) {
        return _owners[node] != address(0);
    }

    function isApprovedForAll(address _owner, address operator) external view returns (bool) {
        return _operators[_owner][operator];
    }
}
