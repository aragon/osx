// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IPermissionCondition} from "../../../../src/common/permission/condition/IPermissionCondition.sol";
import {IProtocolVersion} from "../../../../src/common/utils/versioning/IProtocolVersion.sol";
import {PermissionConditionMock} from "../../../mocks/commons/permission/condition/PermissionConditionMock.sol";
import {PermissionConditionUpgradeableMock} from "../../../mocks/commons/permission/condition/PermissionConditionUpgradeableMock.sol";

/// @dev Minimal shape both `PermissionConditionMock` and
/// `PermissionConditionUpgradeableMock` expose. Lets the shared base call into
/// either variant through one typed reference.
interface IPermissionConditionMock {
    function supportsInterface(bytes4) external view returns (bool);

    function protocolVersion() external view returns (uint8[3] memory);
}

/// @notice Direct tests for `PermissionCondition` and
/// `PermissionConditionUpgradeable` in `src/common/permission/condition/`.
///
/// Ports `osx-commons/contracts/test/permission/condition/permission-condition.ts`
/// (the TS describe was labelled `IProposal` due to a copy-paste error — fixed
/// here). Adds: negative `supportsInterface` case, exact `protocolVersion()`
/// return value, frozen `IPermissionCondition` iface ID matches v1.0.0.
abstract contract PermissionConditionSharedTest is Test {
    /// Frozen `IPermissionCondition` interface ID introduced in v1.0.0.
    /// Single function `isGranted(address,address,bytes32,bytes)`.
    /// Computed via `cast sig "isGranted(address,address,bytes32,bytes)"`.
    bytes4 internal constant IPERMISSION_CONDITION_V1_0_0_INTERFACE_ID =
        0x2675fdd0;

    IPermissionConditionMock internal conditionMock;

    function _deployConditionMock()
        internal
        virtual
        returns (IPermissionConditionMock);

    function setUp() public virtual {
        conditionMock = _deployConditionMock();
    }

    // -------------------------------------------------------------------------
    // IPermissionCondition iface ID (drift detector vs v1.0.0)
    // -------------------------------------------------------------------------

    function test_IPermissionCondition_hasSameInterfaceIdAsV1_0_0()
        public
        pure
    {
        assertEq(
            type(IPermissionCondition).interfaceId,
            IPERMISSION_CONDITION_V1_0_0_INTERFACE_ID
        );
    }

    // -------------------------------------------------------------------------
    // Protocol version
    // -------------------------------------------------------------------------

    function test_protocolVersion_returnsCurrentProductionVersion()
        public
        view
    {
        uint8[3] memory v = conditionMock.protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    // -------------------------------------------------------------------------
    // ERC-165
    // -------------------------------------------------------------------------

    function test_supportsInterface_ERC165() public view {
        assertTrue(conditionMock.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_IPermissionCondition() public view {
        assertTrue(
            conditionMock.supportsInterface(
                type(IPermissionCondition).interfaceId
            )
        );
    }

    function test_supportsInterface_IProtocolVersion() public view {
        assertTrue(
            conditionMock.supportsInterface(type(IProtocolVersion).interfaceId)
        );
    }

    /// GAP: negative case — an unrelated random selector returns false.
    function test_supportsInterface_returnsFalseForUnknownInterface()
        public
        view
    {
        assertFalse(conditionMock.supportsInterface(0xdeadbeef));
        assertFalse(conditionMock.supportsInterface(0x00000000));
    }
}

contract PermissionConditionTest is PermissionConditionSharedTest {
    function _deployConditionMock()
        internal
        override
        returns (IPermissionConditionMock)
    {
        return IPermissionConditionMock(address(new PermissionConditionMock()));
    }
}

contract PermissionConditionUpgradeableTest is PermissionConditionSharedTest {
    function _deployConditionMock()
        internal
        override
        returns (IPermissionConditionMock)
    {
        return
            IPermissionConditionMock(
                address(new PermissionConditionUpgradeableMock())
            );
    }
}
