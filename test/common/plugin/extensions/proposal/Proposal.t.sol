// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Proposal} from "../../../../../src/common/plugin/extensions/proposal/Proposal.sol";
import {ProposalUpgradeable} from "../../../../../src/common/plugin/extensions/proposal/ProposalUpgradeable.sol";
import {IProposal} from "../../../../../src/common/plugin/extensions/proposal/IProposal.sol";
import {ProposalMock} from "../../../../mocks/commons/plugin/extensions/proposal/ProposalMock.sol";
import {
    ProposalUpgradeableMock
} from "../../../../mocks/commons/plugin/extensions/proposal/ProposalUpgradeableMock.sol";

/// @dev Shared shape both Proposal-mock variants expose. Lets the abstract
/// base test call into either via one typed handle.
interface IProposalLike {
    function supportsInterface(bytes4) external view returns (bool);
    function proposalCount() external view returns (uint256);
}

/// @notice Exposes `_createProposalId` for direct testing — needed because
/// the production `_createProposalId` is `internal`. Inherits from the
/// constructable mock to keep the abstract-function stubs intact.
contract ProposalIdHarness is ProposalMock {
    function exposed_createProposalId(bytes32 _salt) external view returns (uint256) {
        return _createProposalId(_salt);
    }
}

/// @notice Shared behaviour tests for `Proposal` and `ProposalUpgradeable` in
/// `src/common/plugin/extensions/proposal/`.
///
/// Ports `osx-commons/contracts/test/plugin/extensions/proposal.ts` and closes
/// the gaps from `TESTS.md` §12: explicit `FunctionDeprecated` revert path,
/// legacy `IProposal` v1.0.0 frozen iface ID matches, `_createProposalId`
/// determinism + uniqueness under typical perturbations.
abstract contract ProposalSharedTest is Test {
    /// Frozen v1.0.0 `IProposal` interface ID: at that time `IProposal` had
    /// only one external function, `proposalCount()`. Single-function
    /// interfaces have ID equal to that function's selector.
    /// Computed via `cast sig "proposalCount()"`.
    bytes4 internal constant IPROPOSAL_V1_0_0_INTERFACE_ID = 0xda35c664;

    IProposalLike internal target;

    function _deployTarget() internal virtual returns (IProposalLike);

    function setUp() public virtual {
        target = _deployTarget();
    }

    // -------------------------------------------------------------------------
    // proposalCount — deprecated; reverts
    // -------------------------------------------------------------------------

    function test_proposalCount_revertsAsDeprecated() public {
        // Match the selector defined on both `Proposal` and `ProposalUpgradeable`.
        vm.expectRevert(Proposal.FunctionDeprecated.selector);
        target.proposalCount();
    }

    // -------------------------------------------------------------------------
    // ERC-165
    // -------------------------------------------------------------------------

    function test_supportsInterface_ERC165() public view {
        assertTrue(target.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_IProposalCurrent() public view {
        assertTrue(target.supportsInterface(type(IProposal).interfaceId));
    }

    function test_supportsInterface_IProposalLegacyV1_0_0() public view {
        // GAP/F12-ish: lock the literal frozen ID against the value computed
        // from XOR'ing off the five functions added since v1.0.0 (which is what
        // the source does inline).
        assertTrue(target.supportsInterface(IPROPOSAL_V1_0_0_INTERFACE_ID));
    }

    function test_supportsInterface_returnsFalseForUnknownInterface() public view {
        assertFalse(target.supportsInterface(0xdeadbeef));
    }

    /// Sanity: the legacy ID equals `type(IProposal).interfaceId` XOR'd with
    /// the five v1.0.0-absent function selectors. Locks the source-side XOR
    /// arithmetic to the literal we assert against above.
    function test_supportsInterface_legacyXorMatchesSource() public pure {
        bytes4 computed = type(IProposal).interfaceId ^ IProposal.createProposal.selector
            ^ IProposal.hasSucceeded.selector ^ IProposal.execute.selector ^ IProposal.canExecute.selector
            ^ IProposal.customProposalParamsABI.selector;
        assertEq(computed, IPROPOSAL_V1_0_0_INTERFACE_ID);
    }
}

/// @notice Constructable variant.
contract ProposalTest is ProposalSharedTest {
    function _deployTarget() internal override returns (IProposalLike) {
        return IProposalLike(address(new ProposalMock()));
    }
}

/// @notice Upgradeable variant.
contract ProposalUpgradeableTest is ProposalSharedTest {
    function _deployTarget() internal override returns (IProposalLike) {
        return IProposalLike(address(new ProposalUpgradeableMock()));
    }
}

/// @notice GAP tests for `_createProposalId` determinism + collision behaviour.
/// Uses a dedicated harness to expose the internal function. Only the
/// constructable variant is tested because the implementation is identical to
/// `ProposalUpgradeable._createProposalId` (verified by inspection of source).
contract ProposalCreateProposalIdTest is Test {
    ProposalIdHarness internal harness;

    function setUp() public {
        harness = new ProposalIdHarness();
    }

    function test_createProposalId_isDeterministic() public view {
        uint256 a = harness.exposed_createProposalId(bytes32("salt"));
        uint256 b = harness.exposed_createProposalId(bytes32("salt"));
        assertEq(a, b);
    }

    function test_createProposalId_differsAcrossSalts() public view {
        uint256 a = harness.exposed_createProposalId(bytes32("a"));
        uint256 b = harness.exposed_createProposalId(bytes32("b"));
        assertTrue(a != b);
    }

    function test_createProposalId_differsAcrossBlockNumbers() public {
        uint256 a = harness.exposed_createProposalId(bytes32("salt"));
        vm.roll(block.number + 1);
        uint256 b = harness.exposed_createProposalId(bytes32("salt"));
        assertTrue(a != b);
    }

    function test_createProposalId_differsAcrossChainIds() public {
        uint256 a = harness.exposed_createProposalId(bytes32("salt"));
        vm.chainId(block.chainid + 1);
        uint256 b = harness.exposed_createProposalId(bytes32("salt"));
        assertTrue(a != b);
    }

    function test_createProposalId_differsAcrossContractInstances() public {
        ProposalIdHarness other = new ProposalIdHarness();
        uint256 a = harness.exposed_createProposalId(bytes32("salt"));
        uint256 b = other.exposed_createProposalId(bytes32("salt"));
        assertTrue(a != b);
    }
}
