// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ENSDomain} from "../../../../src/framework/utils/ens/ENSDomain.sol";

/// @notice Direct tests for the `ENSDomain` library. Reference values for `namehash`
/// were generated with `cast namehash <name>` so they match the canonical
/// EIP-137 implementation.
contract ENSDomainTest is Test {
    // -------------------------------------------------------------------------
    // namehash
    // -------------------------------------------------------------------------

    function test_namehash_emptyReturnsZero() public pure {
        assertEq(ENSDomain.namehash(""), bytes32(0));
    }

    function test_namehash_eth() public pure {
        // cast namehash eth
        assertEq(ENSDomain.namehash("eth"), 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae);
    }

    function test_namehash_twoLabels() public pure {
        // cast namehash dao.eth
        assertEq(ENSDomain.namehash("dao.eth"), 0x4adec6e9f748b29857b9a275dcb59bd0254a069a7e20cab4ec591499254f119a);
    }

    function test_namehash_threeLabels() public pure {
        // cast namehash members.dao.eth
        assertEq(
            ENSDomain.namehash("members.dao.eth"), 0x8348de755e5deb9b453b8daddcebe62e81e1539508088eac81fd3ccbb23245d3
        );
    }

    function test_namehash_fourLabels() public pure {
        // cast namehash alice.members.dao.eth — confirms recursion works for deep names.
        assertEq(
            ENSDomain.namehash("alice.members.dao.eth"),
            0xef2f663d11928cf3db0e94e84fe752e83619caa17332c2f9dc201509a7bb6039
        );
    }

    function test_namehash_aragonxEth() public pure {
        // cast namehash aragonx.eth — a real domain used by the deploy script in some configs.
        assertEq(ENSDomain.namehash("aragonx.eth"), 0xf716425533ab032a6e2d6e1b6cb1c35317851ca62dd9ff2d93b021bca8d41ae7);
    }

    function test_namehash_acceptsHyphensAndDigits() public pure {
        // ENS labels accept [a-z0-9-]. Hyphens and digits affect the value but not the structure
        // — the recursion is identical to a plain ASCII label.
        // cast namehash alice-123.members.dao.eth
        assertEq(
            ENSDomain.namehash("alice-123.members.dao.eth"),
            0x951f762244b930a0d348fbdd181bc5dee0d7947861f1eb603920ad2a6a81efcc
        );
    }

    function test_namehash_dotIsTheOnlySeparator() public pure {
        // Removing the dot must produce a different hash — proves `.` is the only thing that
        // splits labels (hyphens, digits, etc. don't).
        assertTrue(ENSDomain.namehash("members.dao.eth") != ENSDomain.namehash("membersdao.eth"));
    }

    function test_namehash_singleLabel() public pure {
        // namehash of "eth" alone — single label hashed against the zero root.
        bytes32 expected = keccak256(abi.encodePacked(bytes32(0), keccak256("eth")));
        assertEq(ENSDomain.namehash("eth"), expected);
    }

    function test_namehash_isStable() public pure {
        // Calling twice yields the same value.
        assertEq(ENSDomain.namehash("alice.members.dao.eth"), ENSDomain.namehash("alice.members.dao.eth"));
    }

    function test_namehash_caseSensitive() public pure {
        // ENS namehash treats labels as raw bytes — no normalization.
        // "Eth" and "eth" hash differently.
        assertTrue(ENSDomain.namehash("Eth") != ENSDomain.namehash("eth"));
    }

    function test_namehash_distinguishesDifferentDomains() public pure {
        bytes32 a = ENSDomain.namehash("alice.dao.eth");
        bytes32 b = ENSDomain.namehash("bob.dao.eth");
        assertTrue(a != b);
    }

    /// @dev External wrapper so `vm.expectRevert` sees a real call boundary
    /// (the library function is `internal` and would otherwise be inlined).
    function callNamehash(string calldata domain) external pure returns (bytes32) {
        return ENSDomain.namehash(domain);
    }

    function test_namehash_revertsOnTrailingDot() public {
        vm.expectRevert(abi.encodeWithSelector(ENSDomain.InvalidDomain.selector, "eth."));
        this.callNamehash("eth.");

        vm.expectRevert(abi.encodeWithSelector(ENSDomain.InvalidDomain.selector, "members.dao.eth."));
        this.callNamehash("members.dao.eth.");
    }

    function test_namehash_revertsOnLeadingDot() public {
        vm.expectRevert(abi.encodeWithSelector(ENSDomain.InvalidDomain.selector, ".eth"));
        this.callNamehash(".eth");

        vm.expectRevert(abi.encodeWithSelector(ENSDomain.InvalidDomain.selector, ".members.dao.eth"));
        this.callNamehash(".members.dao.eth");
    }

    function test_namehash_revertsOnConsecutiveDots() public {
        vm.expectRevert(abi.encodeWithSelector(ENSDomain.InvalidDomain.selector, "a..b"));
        this.callNamehash("a..b");

        vm.expectRevert(abi.encodeWithSelector(ENSDomain.InvalidDomain.selector, "members..dao.eth"));
        this.callNamehash("members..dao.eth");
    }

    function test_namehash_revertsOnDotOnly() public {
        // A single dot is simultaneously a leading and trailing dot.
        vm.expectRevert(abi.encodeWithSelector(ENSDomain.InvalidDomain.selector, "."));
        this.callNamehash(".");
    }

    // -------------------------------------------------------------------------
    // splitDomain
    // -------------------------------------------------------------------------

    function test_splitDomain_twoLabels() public pure {
        (string memory label, string memory parent) = ENSDomain.splitDomain("dao.eth");
        assertEq(label, "dao");
        assertEq(parent, "eth");
    }

    function test_splitDomain_threeLabels() public pure {
        (string memory label, string memory parent) = ENSDomain.splitDomain("members.dao.eth");
        assertEq(label, "members");
        assertEq(parent, "dao.eth");
    }

    function test_splitDomain_splitsAtFirstDotOnly() public pure {
        // Even with many dots, only the first one splits — parent keeps the rest verbatim.
        (string memory label, string memory parent) = ENSDomain.splitDomain("alice.members.dao.eth");
        assertEq(label, "alice");
        assertEq(parent, "members.dao.eth");
    }

    function test_splitDomain_acceptsHyphensAndDigits() public pure {
        // Hyphens and digits are valid ENS label characters — they don't act as separators.
        (string memory label, string memory parent) = ENSDomain.splitDomain("alice-123.members.dao.eth");
        assertEq(label, "alice-123");
        assertEq(parent, "members.dao.eth");
    }

    function test_splitDomain_singleLabelReturnsEmptyParent() public pure {
        // No dot: the whole input is the label, parent is empty.
        (string memory label, string memory parent) = ENSDomain.splitDomain("eth");
        assertEq(label, "eth");
        assertEq(parent, "");
    }

    function test_splitDomain_emptyReturnsEmptyPair() public pure {
        (string memory label, string memory parent) = ENSDomain.splitDomain("");
        assertEq(label, "");
        assertEq(parent, "");
    }

    // -------------------------------------------------------------------------
    // Cross-property: split + namehash agree with namehash of the original
    // -------------------------------------------------------------------------

    /// @dev `namehash(domain) == keccak256(namehash(parent) || keccak256(label))`
    /// for any `domain` decomposed via `splitDomain` into `(label, parent)`.
    /// This pins the two functions together so a future refactor of either
    /// can't silently disagree. The single-label case (parent == "") relies on
    /// `namehash("") == bytes32(0)` being the EIP-137 recursion base.
    function test_splitAndNamehash_agreeOnRecursion() public pure {
        _assertRecursionAgreement("alice-123.members.dao.eth"); // 4 labels with hyphens + digits
        _assertRecursionAgreement("members.dao.eth"); // 3 labels
        _assertRecursionAgreement("dao.eth"); // 2 labels
        _assertRecursionAgreement("eth"); // single label — exercises the base case
    }

    function _assertRecursionAgreement(string memory full) internal pure {
        (string memory label, string memory parent) = ENSDomain.splitDomain(full);
        bytes32 fromFull = ENSDomain.namehash(full);
        bytes32 recomposed = keccak256(abi.encodePacked(ENSDomain.namehash(parent), keccak256(bytes(label))));
        assertEq(fromFull, recomposed);
    }
}
