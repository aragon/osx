// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {RegistryUtils} from "../../mocks/utils/RegistryUtilsTest.sol";

/// @notice Direct tests for `isSubdomainValid` in
/// `src/framework/utils/RegistryUtils.sol`.
///
/// Ports `packages/contracts/test/framework/utils/registry-utils.ts` (66
/// lines, 2 cases) and adds: empty string, single character (valid and
/// invalid), leading/trailing hyphens, all valid character classes mixed.
/// Validates the canonical alphabet `[a-z0-9-]` exhaustively across the
/// printable ASCII range.
contract RegistryUtilsTest is Test {
    RegistryUtils internal wrapper;

    function setUp() public {
        wrapper = new RegistryUtils();
    }

    // -------------------------------------------------------------------------
    // Helpers — canonical character classification
    // -------------------------------------------------------------------------

    /// True iff the byte is in the valid subdomain alphabet `[a-z0-9-]`.
    function _isValidByte(uint8 c) internal pure returns (bool) {
        if (c >= 0x61 && c <= 0x7a) return true; // a-z
        if (c >= 0x30 && c <= 0x39) return true; // 0-9
        if (c == 0x2d) return true; // -
        return false;
    }

    // -------------------------------------------------------------------------
    // Empty + minimal cases
    // -------------------------------------------------------------------------

    function test_isSubdomainValid_emptyIsAccepted() public view {
        // Source allows empty by design (see the NatSpec).
        assertTrue(wrapper.isSubdomainValid(""));
    }

    function test_isSubdomainValid_singleLowercaseLetter() public view {
        assertTrue(wrapper.isSubdomainValid("a"));
        assertTrue(wrapper.isSubdomainValid("z"));
    }

    function test_isSubdomainValid_singleDigit() public view {
        assertTrue(wrapper.isSubdomainValid("0"));
        assertTrue(wrapper.isSubdomainValid("9"));
    }

    function test_isSubdomainValid_singleHyphen() public view {
        assertTrue(wrapper.isSubdomainValid("-"));
    }

    function test_isSubdomainValid_singleUppercaseLetter() public view {
        assertFalse(wrapper.isSubdomainValid("A"));
        assertFalse(wrapper.isSubdomainValid("Z"));
    }

    function test_isSubdomainValid_singleUnderscore() public view {
        assertFalse(wrapper.isSubdomainValid("_"));
    }

    // -------------------------------------------------------------------------
    // Mixed valid alphabet
    // -------------------------------------------------------------------------

    function test_isSubdomainValid_allValidClassesMixed() public view {
        // Letters + digits + hyphen, no invalid chars.
        assertTrue(wrapper.isSubdomainValid("alice-123"));
        assertTrue(wrapper.isSubdomainValid("a-b-c-1-2-3"));
        assertTrue(wrapper.isSubdomainValid("0a"));
        assertTrue(wrapper.isSubdomainValid("a0"));
    }

    function test_isSubdomainValid_leadingAndTrailingHyphenAccepted() public view {
        // The source allows hyphen at any position. ENS itself may disallow
        // leading/trailing hyphens, but `isSubdomainValid` is purely character-
        // class validation. Lock this in.
        assertTrue(wrapper.isSubdomainValid("-alice"));
        assertTrue(wrapper.isSubdomainValid("alice-"));
        assertTrue(wrapper.isSubdomainValid("-alice-"));
        assertTrue(wrapper.isSubdomainValid("--"));
    }

    // -------------------------------------------------------------------------
    // Exhaustive ASCII scan, short name (< 32 bytes)
    // -------------------------------------------------------------------------

    function test_isSubdomainValid_asciiScanShortName() public view {
        bytes memory base = bytes("this-is-my-super-valid-name");
        for (uint256 i = 0; i < 128; i++) {
            uint8 c = uint8(i);
            // Splice `c` into position 10 of the base name.
            bytes memory mutated = bytes(base);
            mutated[10] = bytes1(c);
            bool expected = _isValidByte(c);
            bool actual = wrapper.isSubdomainValid(string(mutated));
            assertEq(actual, expected);
        }
    }

    // -------------------------------------------------------------------------
    // Exhaustive ASCII scan, long name (> 32 bytes)
    // -------------------------------------------------------------------------

    function test_isSubdomainValid_asciiScanLongName() public view {
        bytes memory base = bytes("this-is-my-super-looooooooooooooooooooooooooong-valid-name");
        for (uint256 i = 0; i < 128; i++) {
            uint8 c = uint8(i);
            // Splice `c` into position 40 of the base name (beyond 32 bytes).
            bytes memory mutated = bytes(base);
            mutated[40] = bytes1(c);
            bool expected = _isValidByte(c);
            bool actual = wrapper.isSubdomainValid(string(mutated));
            assertEq(actual, expected);
        }
    }

    // -------------------------------------------------------------------------
    // Boundary characters — the exact transitions around each allowed range
    // -------------------------------------------------------------------------

    function test_isSubdomainValid_boundaryCharactersAroundAlphabet() public view {
        // 0x2c (",") just below "-" (0x2d)
        assertFalse(wrapper.isSubdomainValid(","));
        // 0x2e (".") just above "-"
        assertFalse(wrapper.isSubdomainValid("."));

        // 0x2f ("/") just below "0" (0x30)
        assertFalse(wrapper.isSubdomainValid("/"));
        // 0x3a (":") just above "9" (0x39)
        assertFalse(wrapper.isSubdomainValid(":"));

        // 0x60 ("`") just below "a" (0x61)
        assertFalse(wrapper.isSubdomainValid("`"));
        // 0x7b ("{") just above "z" (0x7a)
        assertFalse(wrapper.isSubdomainValid("{"));
    }
}
