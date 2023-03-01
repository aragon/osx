// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/// @notice Validates that a subdomain name is composed only from characters in the allowed character set:
/// - the lowercase letters `a-z`
/// - the digits `0-9`
/// - the hyphen `-`
/// @dev This function allows empty (zero-length) subdomains. If this should not be allowed, make sure to add a respective check when using this function in your code.
/// @param subDomain The name of the DAO.
/// @return `true` if the name is valid or `false` if at least one char is invalid.
/// @dev Aborts on the first invalid char found.
function isSubdomainValid(string calldata subDomain) pure returns (bool) {
    bytes calldata nameBytes = bytes(subDomain);
    uint256 nameLength = nameBytes.length;
    for (uint256 i; i < nameLength; i++) {
        uint8 char = uint8(nameBytes[i]);

        // if char is between a-z
        if (char > 96 && char < 123) {
            continue;
        }

        // if char is between 0-9
        if (char > 47 && char < 58) {
            continue;
        }

        // if char is -
        if (char == 45) {
            continue;
        }

        // invalid if one char doesn't work with the rules above
        return false;
    }
    return true;
}
