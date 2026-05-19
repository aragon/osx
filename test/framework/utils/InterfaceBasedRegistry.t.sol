// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {InterfaceBasedRegistry} from "../../../src/framework/utils/InterfaceBasedRegistry.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";
import {DaoUnauthorized} from "../../../src/common/permission/auth/auth.sol";
import {InterfaceBasedRegistryMock} from "../../mocks/utils/InterfaceBasedRegistryMock.sol";
import {DAOMock} from "../../mocks/commons/dao/DAOMock.sol";

/// @dev A contract that ERC-165-claims to be `IDAO`. Stand-in for the real
/// `DAO` contract used by the upstream TS test as a "valid registrant".
contract IDAOClaimer {
    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == type(IDAO).interfaceId || _interfaceId == type(IERC165).interfaceId;
    }
}

/// @dev A contract that ERC-165 supports `IERC165` but not `IDAO`. Stand-in
/// for `PluginRepo` in the upstream test — passes the contract-existence
/// check but fails the target-interface check.
contract WrongInterfaceClaimer {
    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == type(IERC165).interfaceId;
    }
}

/// @notice Direct tests for the `InterfaceBasedRegistry` abstract contract in
/// `src/framework/utils/InterfaceBasedRegistry.sol`.
///
/// Ports `packages/contracts/test/framework/utils/interface-based-registry.ts`
/// (131 lines, 5 cases). Adds: `targetInterfaceId` getter state, explicit
/// `entries(addr)` state mutation check, distinct revert path coverage
/// (`ContractInterfaceInvalid` for both EOA and wrong-interface registrants).
contract InterfaceBasedRegistryTest is Test {
    bytes32 internal constant REGISTER_PERMISSION_ID = keccak256("REGISTER_PERMISSION");

    DAOMock internal daoMock;
    InterfaceBasedRegistryMock internal registry;
    address internal alice;

    function setUp() public {
        alice = makeAddr("alice");
        daoMock = new DAOMock();
        // Default-allow so the caller of `register` clears the auth gate; tests
        // that exercise the auth path flip this off explicitly.
        daoMock.setHasPermissionReturnValueMock(true);

        // Deploy the registry behind a UUPS proxy (required by the
        // `Initializable` base) and initialize with IDAO as the target iface.
        InterfaceBasedRegistryMock impl = new InterfaceBasedRegistryMock();
        bytes memory initCalldata = abi.encodeCall(impl.initialize, (IDAO(address(daoMock)), type(IDAO).interfaceId));
        registry = InterfaceBasedRegistryMock(address(new ERC1967Proxy(address(impl), initCalldata)));
    }

    // -------------------------------------------------------------------------
    // Init / view state
    // -------------------------------------------------------------------------

    function test_init_storesTargetInterfaceId() public view {
        assertEq(registry.targetInterfaceId(), type(IDAO).interfaceId);
    }

    function test_init_storesDaoAddress() public view {
        assertEq(address(registry.dao()), address(daoMock));
    }

    function test_entries_defaultsToFalse() public view {
        assertFalse(registry.entries(address(0xBEEF)));
    }

    // -------------------------------------------------------------------------
    // Register — revert paths
    // -------------------------------------------------------------------------

    function test_register_revertsIfRegistrantIsEOA() public {
        // The OZ ERC165Checker safe-staticcalls into the registrant; a call
        // against an EOA fails its contract-code check and returns false.
        address eoa = makeAddr("eoa");
        vm.expectRevert(abi.encodeWithSelector(InterfaceBasedRegistry.ContractInterfaceInvalid.selector, eoa));
        registry.register(eoa);
    }

    function test_register_revertsIfTargetInterfaceUnsupported() public {
        WrongInterfaceClaimer wrong = new WrongInterfaceClaimer();
        vm.expectRevert(
            abi.encodeWithSelector(InterfaceBasedRegistry.ContractInterfaceInvalid.selector, address(wrong))
        );
        registry.register(address(wrong));
    }

    function test_register_revertsIfCallerLacksRegisterPermission() public {
        daoMock.setHasPermissionReturnValueMock(false);
        IDAOClaimer claimer = new IDAOClaimer();

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector, address(daoMock), address(registry), alice, REGISTER_PERMISSION_ID
            )
        );
        vm.prank(alice);
        registry.register(address(claimer));
    }

    function test_register_revertsIfAlreadyRegistered() public {
        IDAOClaimer claimer = new IDAOClaimer();
        registry.register(address(claimer));
        vm.expectRevert(
            abi.encodeWithSelector(InterfaceBasedRegistry.ContractAlreadyRegistered.selector, address(claimer))
        );
        registry.register(address(claimer));
    }

    // -------------------------------------------------------------------------
    // Register — happy path
    // -------------------------------------------------------------------------

    function test_register_storesEntryAndEmitsEvent() public {
        IDAOClaimer claimer = new IDAOClaimer();
        assertFalse(registry.entries(address(claimer)));

        vm.recordLogs();
        registry.register(address(claimer));
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("Registered(address)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(registry) && logs[i].topics[0] == expectedTopic) {
                address emitted = abi.decode(logs[i].data, (address));
                assertEq(emitted, address(claimer));
                found = true;
                break;
            }
        }
        assertTrue(found, "Registered event not emitted");

        assertTrue(registry.entries(address(claimer)));
    }
}
