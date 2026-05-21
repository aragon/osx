// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {
    IERC721ReceiverUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {
    IERC1155ReceiverUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";

import {DAO} from "../../../src/core/dao/DAO.sol";
import {IEIP4824} from "../../../src/core/dao/IEIP4824.sol";
import {PermissionManager} from "../../../src/core/permission/PermissionManager.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";
import {IExecutor, Action} from "../../../src/common/executors/IExecutor.sol";
import {IPermissionCondition} from "../../../src/common/permission/condition/IPermissionCondition.sol";
import {IProtocolVersion} from "../../../src/common/utils/versioning/IProtocolVersion.sol";
import {PermissionConditionMock} from "../../mocks/permission/PermissionConditionMock.sol";
import {ActionExecute} from "../../mocks/dao/ActionExecute.sol";
import {ERC20Mock} from "../../mocks/token/ERC20Mock.sol";
import {ERC721Mock} from "../../mocks/token/ERC721Mock.sol";
import {ERC1155Mock} from "../../mocks/token/ERC1155Mock.sol";

/// @dev Shared deploy + permission scaffolding for every DAO test contract below.
abstract contract DAOTestBase is Test {
    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");
    bytes32 internal constant UPGRADE_DAO_PERMISSION_ID = keccak256("UPGRADE_DAO_PERMISSION");
    bytes32 internal constant SET_METADATA_PERMISSION_ID = keccak256("SET_METADATA_PERMISSION");
    bytes32 internal constant SET_TRUSTED_FORWARDER_PERMISSION_ID = keccak256("SET_TRUSTED_FORWARDER_PERMISSION");
    bytes32 internal constant REGISTER_STANDARD_CALLBACK_PERMISSION_ID =
        keccak256("REGISTER_STANDARD_CALLBACK_PERMISSION");
    bytes32 internal constant VALIDATE_SIGNATURE_PERMISSION_ID = keccak256("VALIDATE_SIGNATURE_PERMISSION");

    address internal constant ANY_ADDR = address(type(uint160).max);
    bytes4 internal constant ERC1271_VALID = 0x1626ba7e;
    bytes4 internal constant ERC1271_INVALID = 0xffffffff;

    bytes internal constant METADATA = hex"0001";
    string internal constant DAO_URI = "https://example.org";
    address internal trustedForwarder = makeAddr("trustedForwarder");

    DAO internal dao;
    address internal owner;
    address internal other = makeAddr("other");

    function setUp() public virtual {
        owner = address(this);

        DAO impl = new DAO();
        dao = DAO(
            payable(address(
                    new ERC1967Proxy(
                        address(impl), abi.encodeCall(DAO.initialize, (METADATA, owner, trustedForwarder, DAO_URI))
                    )
                ))
        );

        // Initial owner already holds ROOT (via __PermissionManager_init).
        // Grant the rest of the per-function permissions so tests can call them.
        dao.grant(address(dao), owner, SET_METADATA_PERMISSION_ID);
        dao.grant(address(dao), owner, EXECUTE_PERMISSION_ID);
        dao.grant(address(dao), owner, UPGRADE_DAO_PERMISSION_ID);
        dao.grant(address(dao), owner, SET_TRUSTED_FORWARDER_PERMISSION_ID);
        dao.grant(address(dao), owner, REGISTER_STANDARD_CALLBACK_PERMISSION_ID);
    }
}

/// @notice Init / re-init / storage layout / ERC-165 / protocol version.
contract DAOInitializeTest is DAOTestBase {
    function test_initialize_revertsIfReinitialized() public {
        vm.expectRevert(DAO.AlreadyInitialized.selector);
        dao.initialize(METADATA, owner, trustedForwarder, DAO_URI);
    }

    function test_initialize_storesTrustedForwarder() public view {
        assertEq(dao.getTrustedForwarder(), trustedForwarder);
    }

    function test_initialize_setsOzInitializedSlotToThree() public view {
        // OZ Initializable.sol writes `_initialized` at storage slot 0. After
        // `reinitializer(3)`, the slot equals 3.
        bytes32 raw = vm.load(address(dao), bytes32(uint256(0)));
        assertEq(uint8(uint256(raw)), 3);
    }

    function test_initialize_setsReentrancyStatusToNotEntered() public view {
        // `_reentrancyStatus` sits at slot 304 of the DAO storage layout.
        bytes32 raw = vm.load(address(dao), bytes32(uint256(304)));
        assertEq(uint256(raw), 1);
    }

    // ERC-165

    function test_supportsInterface_returnsFalseForEmptyInterface() public view {
        assertFalse(dao.supportsInterface(0xffffffff));
    }

    function test_supportsInterface_IERC165() public view {
        assertTrue(dao.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_IDAO() public view {
        assertTrue(dao.supportsInterface(type(IDAO).interfaceId));
    }

    function test_supportsInterface_IExecutor() public view {
        assertTrue(dao.supportsInterface(type(IExecutor).interfaceId));
    }

    function test_supportsInterface_IProtocolVersion() public view {
        assertTrue(dao.supportsInterface(type(IProtocolVersion).interfaceId));
    }

    function test_supportsInterface_IERC1271() public view {
        assertTrue(dao.supportsInterface(type(IERC1271).interfaceId));
    }

    function test_supportsInterface_IEIP4824() public view {
        assertTrue(dao.supportsInterface(type(IEIP4824).interfaceId));
    }

    function test_supportsInterface_IERC721Receiver() public view {
        assertTrue(dao.supportsInterface(type(IERC721ReceiverUpgradeable).interfaceId));
    }

    function test_supportsInterface_IERC1155Receiver() public view {
        assertTrue(dao.supportsInterface(type(IERC1155ReceiverUpgradeable).interfaceId));
    }

    function test_supportsInterface_legacyXorVariant() public view {
        // The v1.0.0 frozen IDAO iface ID was `IDAO XOR IExecutor.execute`.
        bytes4 legacy = type(IDAO).interfaceId ^ IExecutor.execute.selector;
        assertTrue(dao.supportsInterface(legacy));
    }

    // Protocol version

    function test_protocolVersion_returnsCurrent() public view {
        uint8[3] memory v = dao.protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }
}

/// @notice setTrustedForwarder + setMetadata.
contract DAOMetadataTest is DAOTestBase {
    function test_setTrustedForwarder_revertsIfCallerLacksPermission() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.Unauthorized.selector, address(dao), other, SET_TRUSTED_FORWARDER_PERMISSION_ID
            )
        );
        vm.prank(other);
        dao.setTrustedForwarder(makeAddr("newForwarder"));
    }

    function test_setTrustedForwarder_storesAndEmits() public {
        address newForwarder = makeAddr("newForwarder");
        vm.recordLogs();
        dao.setTrustedForwarder(newForwarder);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 topic = keccak256("TrustedForwarderSet(address)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == topic) {
                assertEq(abi.decode(logs[i].data, (address)), newForwarder);
                found = true;
                break;
            }
        }
        assertTrue(found, "TrustedForwarderSet not emitted");
        assertEq(dao.getTrustedForwarder(), newForwarder);
    }

    function test_setMetadata_revertsIfCallerLacksPermission() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.Unauthorized.selector, address(dao), other, SET_METADATA_PERMISSION_ID
            )
        );
        vm.prank(other);
        dao.setMetadata(hex"22");
    }

    function test_setMetadata_emitsMetadataSet() public {
        vm.recordLogs();
        dao.setMetadata(hex"22");
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 topic = keccak256("MetadataSet(bytes)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == topic) {
                assertEq(abi.decode(logs[i].data, (bytes)), hex"22");
                found = true;
                break;
            }
        }
        assertTrue(found, "MetadataSet not emitted");
    }
}

/// @notice execute() — happy path, failure modes, gas check, reentrancy.
contract DAOExecuteTest is DAOTestBase {
    ActionExecute internal actionMock;

    function setUp() public override {
        super.setUp();
        actionMock = new ActionExecute();
    }

    function _succeedAction() internal view returns (Action memory) {
        return Action({to: address(actionMock), value: 0, data: abi.encodeCall(ActionExecute.setTest, (42))});
    }

    function _failAction() internal view returns (Action memory) {
        return Action({to: address(actionMock), value: 0, data: abi.encodeCall(ActionExecute.fail, ())});
    }

    function test_execute_revertsIfCallerLacksPermission() public {
        Action[] memory actions;
        vm.expectRevert(
            abi.encodeWithSelector(PermissionManager.Unauthorized.selector, address(dao), other, EXECUTE_PERMISSION_ID)
        );
        vm.prank(other);
        dao.execute(bytes32(0), actions, 0);
    }

    function test_execute_revertsIfMoreThanMaxActions() public {
        Action[] memory actions = new Action[](257);
        for (uint256 i = 0; i < 257; i++) {
            actions[i] = _succeedAction();
        }
        vm.expectRevert(DAO.TooManyActions.selector);
        dao.execute(bytes32(0), actions, 0);
    }

    function test_execute_revertsIfActionFailsAndNotInAllowMap() public {
        Action[] memory actions = new Action[](1);
        actions[0] = _failAction();
        vm.expectRevert(abi.encodeWithSelector(DAO.ActionFailed.selector, 0));
        dao.execute(bytes32(0), actions, 0);
    }

    function test_execute_succeedsIfFailureAllowed() public {
        Action[] memory actions = new Action[](1);
        actions[0] = _failAction();
        (bytes[] memory results, uint256 failureMap) = dao.execute(bytes32(0), actions, 1);
        // failureMap bit 0 must be set (action failed but was allowed).
        assertEq(failureMap, 1);
        assertEq(bytes4(results[0]), bytes4(0x08c379a0)); // Error(string) selector
    }

    function test_execute_returnsCorrectResultIfActionSucceeds() public {
        Action[] memory actions = new Action[](1);
        actions[0] = _succeedAction();
        (bytes[] memory results,) = dao.execute(bytes32(0), actions, 0);
        assertEq(abi.decode(results[0], (uint256)), 42);
    }

    function test_execute_constructsFailureMapCorrectly() public {
        // 3 fails (allowed) + 3 succeed.
        uint256 allowMap = (1 << 0) | (1 << 1) | (1 << 2);
        Action[] memory actions = new Action[](6);
        actions[0] = _failAction();
        actions[1] = _failAction();
        actions[2] = _failAction();
        actions[3] = _succeedAction();
        actions[4] = _succeedAction();
        actions[5] = _succeedAction();
        (, uint256 failureMap) = dao.execute(bytes32(0), actions, allowMap);
        assertEq(failureMap, allowMap);
    }

    function test_execute_emitsExecutedAfterAllActions() public {
        Action[] memory actions = new Action[](1);
        actions[0] = _succeedAction();

        vm.recordLogs();
        dao.execute(bytes32(uint256(0xcafe)), actions, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("Executed(address,bytes32,(address,uint256,bytes)[],uint256,uint256,bytes[])");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == expectedTopic) {
                // topics[1] = indexed actor.
                address actor = address(uint160(uint256(logs[i].topics[1])));
                assertEq(actor, address(this));
                found = true;
                break;
            }
        }
        assertTrue(found, "Executed not emitted");
    }
}

/// @notice Reentrancy guard — calling `execute` from within an action reverts.
contract DAOReentrancyAttacker {
    DAO internal immutable dao;

    constructor(DAO _dao) {
        dao = _dao;
    }

    /// Called as an action target. Re-enters `dao.execute(...)` with an empty
    /// action list. Must trip `DAO.ReentrantCall`.
    function reEnter() external {
        Action[] memory inner;
        dao.execute(bytes32(uint256(1)), inner, 0);
    }
}

contract DAOExecuteReentrancyTest is DAOTestBase {
    DAOReentrancyAttacker internal attacker;

    function setUp() public override {
        super.setUp();
        attacker = new DAOReentrancyAttacker(dao);
        // The attacker also needs EXECUTE — otherwise the inner call reverts
        // with Unauthorized before the reentrancy guard fires.
        dao.grant(address(dao), address(attacker), EXECUTE_PERMISSION_ID);
    }

    function test_execute_revertsOnReentrantAction() public {
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(attacker), value: 0, data: abi.encodeCall(DAOReentrancyAttacker.reEnter, ())});

        // The outer execute reverts ActionFailed(0) because the inner reverted
        // ReentrantCall and the failure isn't allowed.
        vm.expectRevert(abi.encodeWithSelector(DAO.ActionFailed.selector, 0));
        dao.execute(bytes32(0), actions, 0);
    }

    function test_execute_capturesReentrantCallInResultsWhenAllowed() public {
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(attacker), value: 0, data: abi.encodeCall(DAOReentrancyAttacker.reEnter, ())});

        (bytes[] memory results,) = dao.execute(bytes32(0), actions, 1);
        assertEq(bytes4(results[0]), DAO.ReentrantCall.selector);
    }

    /// Closes flaw F8 from the audit log: `_reentrancyStatus` must return to
    /// `_NOT_ENTERED = 1` after any execute path — both the success path and
    /// the revert path. The modifier resets on success; EVM state rollback
    /// resets on revert. Reads the raw slot (304) directly to bypass any
    /// view-getter sugar.
    function test_execute_reentrancyGuardResetsAfterRevert() public {
        // 1. After a reverted execute, the slot must be NOT_ENTERED.
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(attacker), value: 0, data: abi.encodeCall(DAOReentrancyAttacker.reEnter, ())});

        // Outer execute reverts because the reentrant inner call propagates.
        try dao.execute(bytes32(0), actions, 0) {
            revert("execute should have reverted");
        } catch {}

        bytes32 slotAfterRevert = vm.load(address(dao), bytes32(uint256(304)));
        assertEq(uint256(slotAfterRevert), 1, "guard not reset after revert");

        // 2. After a successful execute, the slot must also be NOT_ENTERED.
        Action[] memory ok;
        dao.execute(bytes32(uint256(0xa)), ok, 0);
        bytes32 slotAfterSuccess = vm.load(address(dao), bytes32(uint256(304)));
        assertEq(uint256(slotAfterSuccess), 1, "guard not reset after success");
    }
}

/// @notice Token transfer actions executed by the DAO.
contract DAOExecuteTokenTransfersTest is DAOTestBase {
    address internal recipient = makeAddr("recipient");

    function test_execute_revertsIfTransferMoreETHThanDAOHas() public {
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: recipient, value: 1 ether, data: ""});
        vm.expectRevert(abi.encodeWithSelector(DAO.ActionFailed.selector, 0));
        dao.execute(bytes32(0), actions, 0);
    }

    function test_execute_transfersNativeToken() public {
        vm.deal(address(dao), 5 ether);
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: recipient, value: 1 ether, data: ""});
        dao.execute(bytes32(0), actions, 0);
        assertEq(recipient.balance, 1 ether);
    }

    function test_execute_transfersERC20() public {
        ERC20Mock token = new ERC20Mock("Token", "TKN");
        token.setBalance(address(dao), 100 ether);

        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(token),
            value: 0,
            data: abi.encodeWithSignature("transfer(address,uint256)", recipient, 10 ether)
        });
        dao.execute(bytes32(0), actions, 0);
        assertEq(token.balanceOf(recipient), 10 ether);
    }

    function test_execute_revertsIfERC20TransferExceedsBalance() public {
        ERC20Mock token = new ERC20Mock("Token", "TKN");
        token.setBalance(address(dao), 5 ether);

        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(token),
            value: 0,
            data: abi.encodeWithSignature("transfer(address,uint256)", recipient, 10 ether)
        });
        vm.expectRevert(abi.encodeWithSelector(DAO.ActionFailed.selector, 0));
        dao.execute(bytes32(0), actions, 0);
    }
}

/// @notice deposit() function — ZeroAmount + mismatch + ERC20 paths.
contract DAODepositTest is DAOTestBase {
    function test_deposit_revertsIfAmountZero() public {
        vm.expectRevert(DAO.ZeroAmount.selector);
        dao.deposit(address(0), 0, "ref");
    }

    function test_deposit_revertsIfNativeAmountMismatch() public {
        // Passing 0 msg.value but claiming 1 ether of native deposit.
        vm.expectRevert(abi.encodeWithSelector(DAO.NativeTokenDepositAmountMismatch.selector, 1 ether, 0));
        dao.deposit(address(0), 1 ether, "ref");
    }

    function test_deposit_revertsIfERC20AndNativeAtSameTime() public {
        ERC20Mock token = new ERC20Mock("Token", "TKN");
        // For ERC20, msg.value must be zero.
        vm.deal(address(this), 1 ether);
        vm.expectRevert(abi.encodeWithSelector(DAO.NativeTokenDepositAmountMismatch.selector, 0, 1 ether));
        dao.deposit{value: 1 ether}(address(token), 1, "ref");
    }

    function test_deposit_revertsIfSenderLacksERC20Balance() public {
        ERC20Mock token = new ERC20Mock("Token", "TKN");
        token.approve(address(dao), 100 ether);
        vm.expectRevert(); // OZ ERC20: transfer amount exceeds balance
        dao.deposit(address(token), 1, "ref");
    }

    function test_deposit_revertsIfNoERC20Approval() public {
        ERC20Mock token = new ERC20Mock("Token", "TKN");
        token.setBalance(address(this), 100 ether);
        // No approval given to the DAO → safeTransferFrom reverts.
        vm.expectRevert();
        dao.deposit(address(token), 1, "ref");
    }

    function test_deposit_succeedsForNativeAndEmits() public {
        vm.deal(address(this), 5 ether);

        vm.recordLogs();
        dao.deposit{value: 1 ether}(address(0), 1 ether, "ref");
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // event Deposited(address indexed sender, address indexed token, uint256 amount, string _reference)
        bytes32 expectedTopic = keccak256("Deposited(address,address,uint256,string)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == expectedTopic) {
                found = true;
                break;
            }
        }
        assertTrue(found, "Deposited not emitted");
        assertEq(address(dao).balance, 1 ether);
    }

    function test_deposit_succeedsForERC20() public {
        ERC20Mock token = new ERC20Mock("Token", "TKN");
        token.setBalance(address(this), 100 ether);
        token.approve(address(dao), 100 ether);
        dao.deposit(address(token), 5 ether, "ref");
        assertEq(token.balanceOf(address(dao)), 5 ether);
    }
}

/// @notice Direct ERC721/ERC1155 transfers route through the registered callbacks.
contract DAODirectDepositTest is DAOTestBase {
    function test_directTransferERC721_succeedsAndEmitsCallbackReceived() public {
        ERC721Mock token = new ERC721Mock("NFT", "NFT");
        token.mint(address(this), 1);

        vm.recordLogs();
        token.safeTransferFrom(address(this), address(dao), 1);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("CallbackReceived(address,bytes4,bytes)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == expectedTopic) {
                found = true;
                break;
            }
        }
        assertTrue(found, "CallbackReceived not emitted");
        assertEq(token.ownerOf(1), address(dao));
    }

    function test_directTransferERC1155_succeeds() public {
        ERC1155Mock token = new ERC1155Mock("uri");
        // Hold the token on a fresh EOA: OZ ERC1155 `_mint` itself triggers a
        // receiver acceptance check, so it cannot be minted to a contract that
        // doesn't implement `onERC1155Received`.
        address holder = makeAddr("holder");
        vm.prank(holder);
        token.mint(holder, 1, 10);

        vm.prank(holder);
        token.safeTransferFrom(holder, address(dao), 1, 10, "");
        assertEq(token.balanceOf(address(dao), 1), 10);
    }
}

/// @notice ERC-1271 signature validation routed via the permission manager.
contract DAOERC1271Test is DAOTestBase {
    address internal validator = makeAddr("validator");

    function test_isValidSignature_invalidByDefault() public {
        // No grant of VALIDATE_SIGNATURE_PERMISSION → returns 0xffffffff.
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_INVALID);
    }

    function test_isValidSignature_validIfCallerHasBypass() public {
        // Grant direct (no condition).
        dao.grant(address(dao), validator, VALIDATE_SIGNATURE_PERMISSION_ID);
        vm.prank(validator);
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_VALID);
    }

    function test_isValidSignature_routesThroughCondition() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        dao.grantWithCondition(
            address(dao), validator, VALIDATE_SIGNATURE_PERMISSION_ID, IPermissionCondition(address(cond))
        );

        cond.setAnswer(true);
        vm.prank(validator);
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_VALID);

        cond.setAnswer(false);
        vm.prank(validator);
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_INVALID);
    }

    function test_isValidSignature_routesThroughGenericAnyAddr() public {
        // ANY_ADDR with condition — every caller routes through the condition.
        PermissionConditionMock cond = new PermissionConditionMock();
        dao.grantWithCondition(
            address(dao), ANY_ADDR, VALIDATE_SIGNATURE_PERMISSION_ID, IPermissionCondition(address(cond))
        );

        cond.setAnswer(true);
        vm.prank(other);
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_VALID);
        vm.prank(validator);
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_VALID);

        cond.setAnswer(false);
        vm.prank(other);
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_INVALID);
    }

    function test_setSignatureValidator_revertsAsFunctionRemoved() public {
        vm.expectRevert(DAO.FunctionRemoved.selector);
        dao.setSignatureValidator(makeAddr("anyone"));
    }
}

/// @notice daoURI getter, setter, event.
contract DAODaoURITest is DAOTestBase {
    function test_daoURI_returnsInitValue() public view {
        assertEq(dao.daoURI(), DAO_URI);
    }

    function test_setDaoURI_revertsIfCallerLacksPermission() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.Unauthorized.selector, address(dao), other, SET_METADATA_PERMISSION_ID
            )
        );
        vm.prank(other);
        dao.setDaoURI("https://new.example.org");
    }

    function test_setDaoURI_setsAndEmitsNewURI() public {
        string memory newURI = "https://new.example.org";
        vm.recordLogs();
        dao.setDaoURI(newURI);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 topic = keccak256("NewURI(string)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == topic) {
                string memory decoded = abi.decode(logs[i].data, (string));
                assertEq(decoded, newURI);
                found = true;
                break;
            }
        }
        assertTrue(found, "NewURI not emitted");
        assertEq(dao.daoURI(), newURI);
    }
}

/// @notice registerStandardCallback + receive + hasPermission.
contract DAOMiscTest is DAOTestBase {
    function test_registerStandardCallback_revertsIfCallerLacksPermission() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.Unauthorized.selector, address(dao), other, REGISTER_STANDARD_CALLBACK_PERMISSION_ID
            )
        );
        vm.prank(other);
        dao.registerStandardCallback(bytes4(0x12345678), bytes4(0xabcdef00), bytes4(0xabcdef00));
    }

    function test_registerStandardCallback_emitsAndCallbackReturnsMagicNumber() public {
        bytes4 ifaceId = 0x12345678;
        bytes4 selector = 0xabcdef00;
        bytes4 magic = 0xabcdef00;

        vm.recordLogs();
        dao.registerStandardCallback(ifaceId, selector, magic);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 topic = keccak256("StandardCallbackRegistered(bytes4,bytes4,bytes4)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == topic) {
                found = true;
                break;
            }
        }
        assertTrue(found, "StandardCallbackRegistered not emitted");

        // After registration, the new interface ID is supported and calling
        // the callback selector via fallback returns the magic number.
        assertTrue(dao.supportsInterface(ifaceId));

        (bool ok, bytes memory ret) = address(dao).call(abi.encodePacked(selector));
        assertTrue(ok);
        bytes4 returned = abi.decode(ret, (bytes4));
        assertEq(returned, magic);
    }

    function test_receive_emitsNativeTokenDeposited() public {
        vm.deal(other, 5 ether);
        vm.recordLogs();
        vm.prank(other);
        (bool ok,) = address(dao).call{value: 1 ether}("");
        assertTrue(ok);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Both params are unindexed → `data` is `abi.encode(sender, amount)`.
        bytes32 topic = keccak256("NativeTokenDeposited(address,uint256)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == topic) {
                (address sender, uint256 amount) = abi.decode(logs[i].data, (address, uint256));
                assertEq(sender, other);
                assertEq(amount, 1 ether);
                found = true;
                break;
            }
        }
        assertTrue(found, "NativeTokenDeposited not emitted");
    }

    function test_hasPermission_returnsFalseIfNotGranted() public view {
        assertFalse(dao.hasPermission(address(dao), other, EXECUTE_PERMISSION_ID, ""));
    }

    function test_hasPermission_returnsTrueIfGranted() public view {
        // Owner was granted EXECUTE in setUp().
        assertTrue(dao.hasPermission(address(dao), owner, EXECUTE_PERMISSION_ID, ""));
    }
}

/// @notice ANY_ADDR restriction override — five DAO-critical permissions cannot be
/// granted to ANY_ADDR. Mirrors the pattern locked in by `PluginRepo.t.sol`.
contract DAOAnyAddrRestrictionTest is DAOTestBase {
    function test_anyAddr_revertsForEXECUTE() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        dao.grant(address(dao), ANY_ADDR, EXECUTE_PERMISSION_ID);
    }

    function test_anyAddr_revertsForUPGRADE_DAO() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        dao.grant(address(dao), ANY_ADDR, UPGRADE_DAO_PERMISSION_ID);
    }

    function test_anyAddr_revertsForSET_METADATA() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        dao.grant(address(dao), ANY_ADDR, SET_METADATA_PERMISSION_ID);
    }

    function test_anyAddr_revertsForSET_TRUSTED_FORWARDER() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        dao.grant(address(dao), ANY_ADDR, SET_TRUSTED_FORWARDER_PERMISSION_ID);
    }

    function test_anyAddr_revertsForREGISTER_STANDARD_CALLBACK() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        dao.grant(address(dao), ANY_ADDR, REGISTER_STANDARD_CALLBACK_PERMISSION_ID);
    }

    function test_anyAddr_allowsOtherPermissions() public {
        // Unrestricted permission flows through ANY_ADDR.
        bytes32 custom = keccak256("CUSTOM_PERMISSION");
        dao.grant(address(dao), ANY_ADDR, custom);
        assertTrue(dao.hasPermission(address(dao), other, custom, ""));
    }
}
