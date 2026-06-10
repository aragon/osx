// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IMembership} from "../../../../../src/common/plugin/extensions/membership/IMembership.sol";

/// @notice Direct tests for the `IMembership` interface in
/// `src/common/plugin/extensions/membership/IMembership.sol`.
///
/// Ports `osx-commons/contracts/test/plugin/extensions/membership.ts`. The
/// single TS test compared `getInterfaceId(IMembership__factory)` against
/// the v1.0.0 frozen ID via a typechain import; here we replace that
/// dependency with an inline literal — drift in either direction (renamed
/// function, added function, changed signature) breaks compilation
/// of `type(IMembership).interfaceId` or the equality assertion.
contract IMembershipTest is Test {
    /// Frozen iface ID introduced in v1.0.0. `IMembership` has a single
    /// external function `isMember(address)`; its ERC-165 ID is that
    /// function's selector.
    /// Computed via `cast sig "isMember(address)"`.
    bytes4 internal constant IMEMBERSHIP_V1_0_0_INTERFACE_ID = 0xa230c524;

    function test_IMembership_hasSameInterfaceIdAsV1_0_0() public pure {
        assertEq(type(IMembership).interfaceId, IMEMBERSHIP_V1_0_0_INTERFACE_ID);
    }

    function test_IMembership_interfaceIdIsNotEmpty() public pure {
        assertTrue(type(IMembership).interfaceId != bytes4(0));
    }

    function test_IMembership_interfaceIdIsNotIERC165() public pure {
        assertTrue(type(IMembership).interfaceId != type(IERC165).interfaceId);
    }
}
