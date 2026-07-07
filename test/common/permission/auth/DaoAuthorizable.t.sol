// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {DaoUnauthorized} from "../../../../src/common/permission/auth/auth.sol";
import {DaoAuthorizableMock} from "../../../mocks/commons/permission/auth/DaoAuthorizableMock.sol";
import {DaoAuthorizableUpgradeableMock} from "../../../mocks/commons/permission/auth/DaoAuthorizableUpgradeableMock.sol";
import {DAOMock} from "../../../mocks/commons/dao/DAOMock.sol";

/// @dev Minimal shape both `DaoAuthorizableMock` and `DaoAuthorizableUpgradeableMock` expose.
/// Lets the shared base test contract call into either variant through one typed reference.
interface IDaoAuthorizableMock {
    function dao() external view returns (IDAO);

    function authorizedFunc() external;
}

/// @notice Shared behaviour tests for `DaoAuthorizable` and `DaoAuthorizableUpgradeable`.
///
/// Ports `osx-commons/contracts/test/permission/auth/dao-authorizable.ts`. The
/// TS suite's `daoAuthorizableBaseTests(fixture)` DRY pattern is reproduced
/// via this abstract base + two concrete derivations (one per source contract).
/// Adds: `DaoUnauthorized` error carries all four fields, auth guard reverts
/// (no silent fallthrough), and `dao()` returns the exact stored address.
abstract contract DaoAuthorizableSharedTest is Test {
    bytes32 internal constant PERM_ID = keccak256("AUTHORIZED_FUNC_PERMISSION");

    DAOMock internal daoMock;
    IDaoAuthorizableMock internal target;
    address internal bob;

    /// Concrete subclasses construct one variant of the mock and return it.
    function _deployTarget() internal virtual returns (IDaoAuthorizableMock);

    function setUp() public virtual {
        bob = makeAddr("bob");
        daoMock = new DAOMock();
        target = _deployTarget();
    }

    function test_dao_returnsConstructorOrInitDao() public view {
        assertEq(address(target.dao()), address(daoMock));
    }

    function test_authorizedFunc_revertsIfPermissionNotGranted() public {
        // The mock DAO defaults to `hasPermission == false`.
        assertFalse(daoMock.hasPermissionReturnValueMock());

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(daoMock),
                address(target),
                bob,
                PERM_ID
            )
        );
        vm.prank(bob);
        target.authorizedFunc();
    }

    function test_authorizedFunc_succeedsIfPermissionGranted() public {
        daoMock.setHasPermissionReturnValueMock(true);
        vm.prank(bob);
        target.authorizedFunc();
    }

    /// The auth modifier forwards the FULL original calldata to the DAO's
    /// `hasPermission(_where, _who, _permissionId, _data)` call. Locks in
    /// the `_msgData()` plumbing — conditions receive the caller's selector
    /// + args, not a synthetic payload.
    function test_auth_forwardsCalldataToDao() public {
        daoMock.setHasPermissionReturnValueMock(true);

        bytes memory innerCalldata = abi.encodeWithSelector(IDaoAuthorizableMock.authorizedFunc.selector);
        bytes memory expectedDaoCall = abi.encodeWithSelector(
            IDAO.hasPermission.selector,
            address(target),
            bob,
            PERM_ID,
            innerCalldata
        );

        vm.expectCall(address(daoMock), expectedDaoCall);
        vm.prank(bob);
        target.authorizedFunc();
    }

    /// `DaoUnauthorized(address,address,address,bytes32)` selector is locked.
    /// If any field is renamed or reordered, the selector drifts and the
    /// caller-side `vm.expectRevert(DaoUnauthorized.selector)` calls in
    /// other test files break — this detector pins it explicitly.
    function test_daoUnauthorized_selectorDriftDetector() public pure {
        assertEq(DaoUnauthorized.selector, bytes4(0x32dbe3b4));
    }
}

/// @notice Constructable variant: `DaoAuthorizable` is set via constructor.
contract DaoAuthorizableTest is DaoAuthorizableSharedTest {
    function _deployTarget() internal override returns (IDaoAuthorizableMock) {
        return
            IDaoAuthorizableMock(
                address(new DaoAuthorizableMock(IDAO(address(daoMock))))
            );
    }
}

/// @notice Upgradeable variant: `DaoAuthorizableUpgradeable` is set via initializer.
/// Adds the two TS-side tests for the initializer guard.
contract DaoAuthorizableUpgradeableTest is DaoAuthorizableSharedTest {
    function _deployTarget() internal override returns (IDaoAuthorizableMock) {
        DaoAuthorizableUpgradeableMock impl = new DaoAuthorizableUpgradeableMock();
        impl.initialize(IDAO(address(daoMock)));
        return IDaoAuthorizableMock(address(impl));
    }

    function test_initialize_revertsIfCalledTwice() public {
        DaoAuthorizableUpgradeableMock m = DaoAuthorizableUpgradeableMock(
            address(target)
        );
        vm.expectRevert("Initializable: contract is already initialized");
        m.initialize(IDAO(address(daoMock)));
    }

    function test_initInternal_revertsIfCalledOutsideInitializer() public {
        DaoAuthorizableUpgradeableMock m = DaoAuthorizableUpgradeableMock(
            address(target)
        );
        vm.expectRevert("Initializable: contract is not initializing");
        m.notAnInitializer(IDAO(address(daoMock)));
    }

    /// Drift detector for the `uint256[49]` tail gap. Probe a slot deep
    /// enough to be inside the gap on the current layout; should be zero
    /// on a fresh deploy. If the gap shrinks without a major-version bump,
    /// upgrade-shaped tests catch the collision.
    function test_storageGap_sentinelSlotIsUnused() public view {
        bytes32 sentinel = bytes32(uint256(80));
        bytes32 raw = vm.load(address(target), sentinel);
        assertEq(uint256(raw), 0, "gap slot 80 should be unused");
    }
}
