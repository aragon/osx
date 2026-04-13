// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

/// @notice ENS utilities for deploy scripts.
library ENSUtils {
    /// @dev Computes the ENS namehash of a dot-separated domain (e.g., "members.dao.eth").
    function namehash(string memory domain) internal pure returns (bytes32 result) {
        if (bytes(domain).length == 0) return bytes32(0);

        bytes memory b = bytes(domain);
        uint256 end = b.length;

        for (uint256 i = b.length; i > 0; i--) {
            if (b[i - 1] == ".") {
                result = keccak256(abi.encodePacked(result, _labelHash(b, i, end)));
                end = i - 1;
            }
        }
        result = keccak256(abi.encodePacked(result, _labelHash(b, 0, end)));
    }

    /// @dev Splits "members.dao.eth" into ("members", "dao.eth") at the first dot.
    ///      Reverts if the domain contains no dot.
    function splitDomain(
        string memory domain
    ) internal pure returns (string memory label, string memory parent) {
        bytes memory b = bytes(domain);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] == ".") {
                label = new string(i);
                parent = new string(b.length - i - 1);
                bytes memory lb = bytes(label);
                bytes memory pb = bytes(parent);
                for (uint256 j = 0; j < i; j++) lb[j] = b[j];
                for (uint256 j = i + 1; j < b.length; j++) pb[j - i - 1] = b[j];
                return (label, parent);
            }
        }
        revert("ENSUtils: domain must contain at least one dot");
    }

    function _labelHash(bytes memory b, uint256 start, uint256 end) private pure returns (bytes32) {
        bytes memory label = new bytes(end - start);
        for (uint256 i = start; i < end; i++) label[i - start] = b[i];
        return keccak256(label);
    }
}
