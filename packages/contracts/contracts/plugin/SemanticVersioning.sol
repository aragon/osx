// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @notice Thrown if a semantic version number bump is invalid.
/// @param currentVersion The current semantic version number.
/// @param nextVersion The next semantic version number.
error BumpInvalid(uint16[3] currentVersion, uint16[3] nextVersion);

/// @notice Checks if a semantic version bump is valid. The version elements (major, minor, and patch) are only allowed to be incremented by 1, respectively, and all subsequent numbers must be decremented to 0.
/// @param _oldVersion The old semantic version number.
/// @param _newVersion The new semantic version number.
/// @return bool Returns true if the bump is valid.
function isValidBumpStrict(
    uint16[3] memory _oldVersion,
    uint16[3] memory _newVersion
) pure returns (bool) {
    uint256 i = 0;
    bool hasIncreased;

    while (i < 3) {
        if (hasIncreased) {
            if (_newVersion[i] != 0) {
                return false;
            }
        } else if (_newVersion[i] != _oldVersion[i]) {
            if (_oldVersion[i] > _newVersion[i] || _newVersion[i] - _oldVersion[i] != 1) {
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

/// @notice Checks if a semantic version bump is valid. All version elements (major, minor, and patch) can increase by 1 or more.
/// @param _oldVersion The old semantic version number.
/// @param _newVersion The new semantic version number.
/// @return bool Returns true if the bump is valid.
function isValidBumpLoose(
    uint16[3] memory _oldVersion,
    uint16[3] memory _newVersion
) pure returns (bool) {
    uint256 i = 0;
    while (i < 3) {
        if (_newVersion[i] > _oldVersion[i]) {
            return true;
        }
        unchecked {
            ++i;
        }
    }
    return false;
}
