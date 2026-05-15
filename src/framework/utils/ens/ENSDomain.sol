// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

/// @title ENSDomain
/// @notice Pure-string utilities for working with ENS domain names: namehash (EIP-137)
/// and splitting at the first dot. Single source of truth used by the contract,
/// deploy scripts and tests.
library ENSDomain {
    /// @notice Thrown when `domain` is structurally malformed
    error InvalidDomain(string domain);

    /// @notice Returns the namehash of `domain` (e.g., `"members.dao.eth"`).
    /// @dev Returns `bytes32(0)` for an empty input. Reverts with `InvalidDomain` on
    /// structurally malformed inputs. Does not validate label characters:
    /// callers must enforce any extra rules separately.
    function namehash(string memory domain) internal pure returns (bytes32 result) {
        bytes memory b = bytes(domain);
        if (b.length == 0) return bytes32(0);

        uint256 end = b.length;
        for (uint256 i = b.length; i > 0; i--) {
            if (b[i - 1] == ".") {
                // Trailing dot (first iter) or consecutive dot (subsequent iters): empty label.
                if (i == end) revert InvalidDomain(domain);
                result = keccak256(abi.encodePacked(result, _labelHash(b, i, end)));
                end = i - 1;
            }
        }
        // Leading dot: the first label is empty.
        if (end == 0) revert InvalidDomain(domain);
        result = keccak256(abi.encodePacked(result, _labelHash(b, 0, end)));
    }

    /// @notice Splits a domain at its first dot.
    /// @dev Total function — never reverts. Examples:
    ///      - `"members.dao.eth"` → `("members", "dao.eth")`
    ///      - `"eth"`             → `("eth", "")`         (no dot: whole input is the label, no parent)
    ///      - `""`                → `("", "")`            (empty input)
    ///
    ///      The "no parent" case composes correctly with `namehash`, since
    ///      `namehash("") == bytes32(0)` is the EIP-137 recursion base.
    function splitDomain(string memory domain) internal pure returns (string memory label, string memory parent) {
        bytes memory b = bytes(domain);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] == ".") {
                label = new string(i);
                parent = new string(b.length - i - 1);
                bytes memory lb = bytes(label);
                bytes memory pb = bytes(parent);
                for (uint256 j = 0; j < i; j++) {
                    lb[j] = b[j];
                }
                for (uint256 j = i + 1; j < b.length; j++) {
                    pb[j - i - 1] = b[j];
                }
                return (label, parent);
            }
        }
        // No dot: the whole input is the label, parent is empty.
        return (domain, "");
    }

    function _labelHash(bytes memory b, uint256 start, uint256 end) private pure returns (bytes32) {
        bytes memory label = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            label[i - start] = b[i];
        }
        return keccak256(label);
    }
}
