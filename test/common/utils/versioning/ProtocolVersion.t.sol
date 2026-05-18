// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IProtocolVersion} from "../../../../src/common/utils/versioning/IProtocolVersion.sol";
import {ProtocolVersionMock} from "../../../mocks/commons/utils/versioning/ProtocolVersionMock.sol";

/// @notice Direct tests for the abstract `ProtocolVersion` base contract and
/// the `IProtocolVersion` interface in `src/common/utils/versioning/`.
///
/// Ports `osx-commons/contracts/test/utils/versioning/protocol-version.ts`
/// and closes the gaps from `TESTS.md` §5: exact return-value check against
/// the inline `[1, 4, 0]` constant (replacing the TS dependency on
/// `package.json`), stateless / deterministic across calls.
contract ProtocolVersionTest is Test {
    /// Frozen iface ID introduced in v1.3.0. `IProtocolVersion` has a single
    /// function `protocolVersion()`, so its ERC-165 ID equals that function's
    /// selector. If the interface ever changes (added/removed/renamed
    /// function), this literal stops matching and the test fails — exactly
    /// the drift detection the TS `getInterfaceId(...) == initial` did.
    bytes4 internal constant IPROTOCOL_VERSION_V1_3_0_INTERFACE_ID = 0x2ae9c600;

    /// The production protocol version that the absorbed `ProtocolVersion.sol`
    /// returns. Lifted to a constant so a change in the source forces a deliberate
    /// edit here too.
    uint8 internal constant MAJOR = 1;
    uint8 internal constant MINOR = 4;
    uint8 internal constant PATCH = 0;

    ProtocolVersionMock internal mock;

    function setUp() public {
        mock = new ProtocolVersionMock();
    }

    // -------------------------------------------------------------------------
    // IProtocolVersion — interface ID
    // -------------------------------------------------------------------------

    function test_IProtocolVersion_hasSameInterfaceIdAsV1_3_0() public pure {
        assertEq(type(IProtocolVersion).interfaceId, IPROTOCOL_VERSION_V1_3_0_INTERFACE_ID);
    }

    function test_IProtocolVersion_interfaceIdIsNotEmpty() public pure {
        // Sanity: the selector XOR for a single-function interface is the
        // function selector itself, which must be non-zero.
        assertTrue(type(IProtocolVersion).interfaceId != bytes4(0));
    }

    function test_IProtocolVersion_interfaceIdIsNotIERC165() public pure {
        // Cross-check: `IProtocolVersion` is a distinct interface, not an alias
        // of `IERC165`.
        assertTrue(type(IProtocolVersion).interfaceId != type(IERC165).interfaceId);
    }

    // -------------------------------------------------------------------------
    // ProtocolVersion — concrete value
    // -------------------------------------------------------------------------

    function test_protocolVersion_returnsCurrentProductionVersion() public view {
        uint8[3] memory v = mock.protocolVersion();
        assertEq(v[0], MAJOR);
        assertEq(v[1], MINOR);
        assertEq(v[2], PATCH);
    }

    function test_protocolVersion_isDeterministicAcrossCalls() public view {
        // GAP: function is `pure` — repeated calls must return the identical
        // tuple. Locks against accidental refactor to a state-touching
        // implementation.
        uint8[3] memory a = mock.protocolVersion();
        uint8[3] memory b = mock.protocolVersion();
        assertEq(a[0], b[0]);
        assertEq(a[1], b[1]);
        assertEq(a[2], b[2]);
    }
}
