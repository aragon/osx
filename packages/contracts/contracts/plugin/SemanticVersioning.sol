// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @notice Checks if a semantic version bump is valid.
/// @param _oldVersion The old semantic version number.
/// @param _newVersion The new semantic version number.
/// @return bool Returns true if the bump is valid.
function isValidSemanticBump(uint16[3] memory _oldVersion, uint16[3] memory _newVersion)
    pure
    returns (bool)
{
    bool hasIncreased;
    uint256 i = 0;
    while (i < 3) {
        if (hasIncreased) {
            if (_newVersion[i] != 0) {
                return false;
            }
        } else if (_newVersion[i] != _oldVersion[i]) {
            if (_oldVersion[i] > _newVersion[i]) {
                return false;
            }
            hasIncreased = true;
        }
        unchecked {
            ++i;
        }
    }
    return hasIncreased;
}
