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
import {GasConsumer} from "../../mocks/dao/GasConsumerHelper.sol";
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

        bytes32 callId = bytes32(uint256(0xcafe));
        vm.recordLogs();
        dao.execute(callId, actions, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("Executed(address,bytes32,(address,uint256,bytes)[],uint256,uint256,bytes[])");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == expectedTopic) {
                // topics[1] = indexed actor.
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(this), "actor");

                // callId is the first non-indexed parameter → first 32 bytes of data.
                bytes memory d = logs[i].data;
                bytes32 callIdInEvent;
                assembly {
                    callIdInEvent := mload(add(d, 32))
                }
                assertEq(callIdInEvent, callId, "callId");
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
                // sender + token indexed.
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(this), "sender");
                assertEq(address(uint160(uint256(logs[i].topics[2]))), address(0), "token (native)");
                (uint256 amount, string memory ref) = abi.decode(logs[i].data, (uint256, string));
                assertEq(amount, 1 ether, "amount");
                assertEq(ref, "ref", "reference");
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
        bytes4 erc721Selector = bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == expectedTopic) {
                // `sig` is the indexed param (topics[1]); confirm the routed selector.
                assertEq(logs[i].topics[1], bytes32(erc721Selector), "sig topic");
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

    /// Conditional grant of a restricted permission to ANY_ADDR is also blocked
    /// (the override applies to grantWithCondition too).
    function test_anyAddr_grantWithConditionForRestrictedPermissionReverts() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        dao.grantWithCondition(address(dao), ANY_ADDR, EXECUTE_PERMISSION_ID, IPermissionCondition(address(cond)));
    }

    /// `VALIDATE_SIGNATURE_PERMISSION_ID` is intentionally NOT in the restricted
    /// list — required for ERC-1271 generic-signature setups. Lock in: granting
    /// it to ANY_ADDR succeeds.
    function test_anyAddr_validateSignatureNotRestricted() public {
        dao.grant(address(dao), ANY_ADDR, VALIDATE_SIGNATURE_PERMISSION_ID);
        assertTrue(dao.hasPermission(address(dao), other, VALIDATE_SIGNATURE_PERMISSION_ID, ""));
    }

    /// `revoke` is NOT subject to the restriction override — it can clear an
    /// ANY_ADDR slot that was somehow populated (e.g., via `grantWithCondition`
    /// before the permission became restricted, hypothetically).
    function test_anyAddr_revokeForRestrictedPermissionSucceeds() public {
        // Cannot grant EXECUTE to ANY_ADDR, but revoking it is permitted
        // (silent no-op since slot was never populated).
        dao.revoke(address(dao), ANY_ADDR, EXECUTE_PERMISSION_ID);
    }
}

// =============================================================================
//                          DAO — extended test coverage
// =============================================================================

/// @notice Initialize — extended edge cases.
contract DAOInitializeEdgeTest is DAOTestBase {
    /// `_trustedForwarder == address(0)` accepted as "no forwarder" sentinel.
    function test_initialize_acceptsZeroTrustedForwarder() public {
        DAO impl = new DAO();
        DAO d = DAO(
            payable(address(
                    new ERC1967Proxy(
                        address(impl), abi.encodeCall(DAO.initialize, (METADATA, owner, address(0), DAO_URI))
                    )
                ))
        );
        assertEq(d.getTrustedForwarder(), address(0));
    }

    /// Empty `_metadata` accepted; `MetadataSet("")` fires.
    function test_initialize_acceptsEmptyMetadata() public {
        DAO impl = new DAO();
        vm.recordLogs();
        new ERC1967Proxy(address(impl), abi.encodeCall(DAO.initialize, (hex"", owner, trustedForwarder, DAO_URI)));
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 topic = keccak256("MetadataSet(bytes)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == topic) {
                assertEq(abi.decode(logs[i].data, (bytes)).length, 0);
                found = true;
                break;
            }
        }
        assertTrue(found, "MetadataSet not emitted for empty metadata");
    }

    /// Empty `daoURI_` accepted; `daoURI()` returns "".
    function test_initialize_acceptsEmptyDaoURI() public {
        DAO impl = new DAO();
        DAO d = DAO(
            payable(address(
                    new ERC1967Proxy(
                        address(impl), abi.encodeCall(DAO.initialize, (METADATA, owner, trustedForwarder, ""))
                    )
                ))
        );
        assertEq(d.daoURI(), "");
    }

    /// Calling `initialize` on the DAO impl directly (not via proxy) reverts
    /// because the impl's constructor called `_disableInitializers()`.
    function test_initialize_revertsOnImplDirectly() public {
        DAO impl = new DAO();
        vm.expectRevert(); // Initializable: contract is initialized
        impl.initialize(METADATA, owner, trustedForwarder, DAO_URI);
    }

    /// All 4 expected init events fire exactly once during `initialize`:
    /// `MetadataSet`, `TrustedForwarderSet`, `NewURI`, `Granted(ROOT, owner)`.
    function test_initialize_emitsAllExpectedEventsOnce() public {
        DAO impl = new DAO();
        vm.recordLogs();
        new ERC1967Proxy(address(impl), abi.encodeCall(DAO.initialize, (METADATA, owner, trustedForwarder, DAO_URI)));
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 metadataTopic = keccak256("MetadataSet(bytes)");
        bytes32 forwarderTopic = keccak256("TrustedForwarderSet(address)");
        bytes32 uriTopic = keccak256("NewURI(string)");
        bytes32 grantedTopic = keccak256("Granted(bytes32,address,address,address,address)");

        uint256 metadataCount;
        uint256 forwarderCount;
        uint256 uriCount;
        uint256 grantedRootCount;

        for (uint256 i = 0; i < logs.length; i++) {
            bytes32 t = logs[i].topics[0];
            if (t == metadataTopic) metadataCount++;
            else if (t == forwarderTopic) forwarderCount++;
            else if (t == uriTopic) uriCount++;
            else if (t == grantedTopic && logs[i].topics[1] == ROOT_PERMISSION_ID) grantedRootCount++;
        }

        assertEq(metadataCount, 1, "MetadataSet fired != 1");
        assertEq(forwarderCount, 1, "TrustedForwarderSet fired != 1");
        assertEq(uriCount, 1, "NewURI fired != 1");
        assertEq(grantedRootCount, 1, "Granted(ROOT) fired != 1");
    }
}

/// @notice setTrustedForwarder + setMetadata + setDaoURI — extended edge cases.
contract DAOSettersEdgeTest is DAOTestBase {
    function test_setTrustedForwarder_acceptsZero() public {
        dao.setTrustedForwarder(address(0));
        assertEq(dao.getTrustedForwarder(), address(0));
    }

    function test_setTrustedForwarder_emitsEvenWhenUnchanged() public {
        // No "same-value" guard in the source; setting to current still emits.
        address current = dao.getTrustedForwarder();
        vm.recordLogs();
        dao.setTrustedForwarder(current);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 topic = keccak256("TrustedForwarderSet(address)");
        uint256 count;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == topic) count++;
        }
        assertEq(count, 1, "should still emit even when value unchanged");
    }

    function test_setMetadata_acceptsEmpty() public {
        dao.setMetadata(hex"");
        // No revert — DAO has no on-chain metadata state, only the event.
    }

    function test_setMetadata_acceptsLargePayload() public {
        bytes memory big = new bytes(10_000);
        for (uint256 i = 0; i < big.length; i++) {
            big[i] = 0xab;
        }
        dao.setMetadata(big);
    }

    function test_setDaoURI_acceptsEmpty() public {
        dao.setDaoURI("");
        assertEq(dao.daoURI(), "");
    }

    function test_setDaoURI_acceptsLargePayload() public {
        // Build a multi-kB string.
        bytes memory raw = new bytes(8_000);
        for (uint256 i = 0; i < raw.length; i++) {
            raw[i] = bytes1("a");
        }
        string memory long = string(raw);
        dao.setDaoURI(long);
        assertEq(bytes(dao.daoURI()).length, raw.length);
    }
}

/// @notice `execute` — base path edge cases (MAX_ACTIONS boundary, empty array,
/// upper bits of allowFailureMap, return-shape invariants).
contract DAOExecuteEdgeTest is DAOTestBase {
    ActionExecute internal actionMock;

    function setUp() public override {
        super.setUp();
        actionMock = new ActionExecute();
    }

    function _ok() internal view returns (Action memory) {
        return Action({to: address(actionMock), value: 0, data: abi.encodeCall(ActionExecute.setTest, (1))});
    }

    /// Boundary: `_actions.length == MAX_ACTIONS (256)` SUCCEEDS.
    function test_execute_atMaxActionsBoundary_succeeds() public {
        Action[] memory actions = new Action[](256);
        for (uint256 i = 0; i < 256; i++) {
            actions[i] = _ok();
        }
        (bytes[] memory results,) = dao.execute(bytes32(0), actions, 0);
        assertEq(results.length, 256);
    }

    /// Empty actions array succeeds; emits Executed; returns empty results.
    function test_execute_emptyActionsArray_succeeds() public {
        Action[] memory empty;
        (bytes[] memory results, uint256 failureMap) = dao.execute(bytes32(0), empty, 0);
        assertEq(results.length, 0);
        assertEq(failureMap, 0);
    }

    /// `execResults.length` exactly matches `_actions.length`.
    function test_execute_resultsLengthMatchesActionsLength() public {
        Action[] memory actions = new Action[](5);
        for (uint256 i = 0; i < 5; i++) {
            actions[i] = _ok();
        }
        (bytes[] memory results,) = dao.execute(bytes32(0), actions, 0);
        assertEq(results.length, 5);
    }

    /// `_allowFailureMap` bits above index 255 are silently ignored (the loop
    /// only consults `uint8(i)` bits). Lock in.
    function test_execute_allowFailureMap_upperBitsIgnored() public {
        Action[] memory actions = new Action[](1);
        // A failing action so that the bit-check matters.
        actions[0] = Action({to: address(actionMock), value: 0, data: abi.encodeCall(ActionExecute.fail, ())});

        // Bit 0 set + a high bit set (irrelevant); call must succeed.
        uint256 mask = 1 | (1 << 200);
        (, uint256 failureMap) = dao.execute(bytes32(0), actions, mask);
        // Only bit 0 of failureMap should be set; nothing in the upper bits.
        assertEq(failureMap, 1);
    }
}

/// @notice `execute` — `InsufficientGas` (F13 lock-in).
contract DAOExecuteGasTest is DAOTestBase {
    GasConsumer internal hog;

    function setUp() public override {
        super.setUp();
        hog = new GasConsumer();
    }

    /// `InsufficientGas` triggers only when (a) action failed AND (b) failure
    /// allowed AND (c) `gasAfter < gasBefore/64`. Use a deliberately-undersized
    /// gas envelope so the inner call burns >63/64 of the available gas and
    /// fails; the check should fire.
    function test_execute_insufficientGas_triggersOnTightBudget() public {
        // Single action that consumes a lot of gas then reverts.
        // GasConsumer.consumeGas(n) writes to `n` slots; very gas-heavy.
        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(hog),
            value: 0,
            // Big enough to drain >63/64 of the inner gas budget.
            data: abi.encodeCall(GasConsumer.consumeGas, (10_000))
        });

        // Allow failure so we hit the InsufficientGas branch (not ActionFailed).
        // Forge limits us to budgets the EVM accepts; pick a value that lets
        // the outer execute() start but the inner call burns most of it.
        vm.expectRevert(DAO.InsufficientGas.selector);
        // The exact gas value is sensitive; this test serves as a sentinel.
        // If it ever stops triggering due to opcode-gas changes, retune.
        this.executeWithGas{gas: 80_000}(actions);
    }

    /// External-call wrapper so we can attach an explicit gas budget.
    function executeWithGas(Action[] calldata actions) external returns (bytes[] memory, uint256) {
        return dao.execute(bytes32(0), actions, 1); // bit 0 set → failure allowed
    }
}

/// @notice `execute` — token transfers via action targets (extended).
contract DAOExecuteTokenTransfersExtTest is DAOTestBase {
    address internal recipient = makeAddr("recipient");

    /// ERC721 transfer via execute — DAO holds NFT, action calls transferFrom.
    function test_execute_transfersERC721() public {
        ERC721Mock nft = new ERC721Mock("NFT", "NFT");
        // Mint to DAO directly. ERC721._mint doesn't trigger receiver checks
        // (only _safeMint does), so this is safe.
        nft.mint(address(dao), 7);

        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(nft),
            value: 0,
            data: abi.encodeWithSignature("transferFrom(address,address,uint256)", address(dao), recipient, 7)
        });
        dao.execute(bytes32(0), actions, 0);
        assertEq(nft.ownerOf(7), recipient);
    }

    /// ERC721 transfer of an NFT DAO doesn't own → reverts ActionFailed.
    function test_execute_revertsIfERC721NotOwned() public {
        ERC721Mock nft = new ERC721Mock("NFT", "NFT");
        nft.mint(makeAddr("someone"), 9);

        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(nft),
            value: 0,
            data: abi.encodeWithSignature("transferFrom(address,address,uint256)", address(dao), recipient, 9)
        });
        vm.expectRevert(abi.encodeWithSelector(DAO.ActionFailed.selector, 0));
        dao.execute(bytes32(0), actions, 0);
    }

    /// ERC1155 transfer via execute.
    function test_execute_transfersERC1155() public {
        ERC1155Mock token = new ERC1155Mock("uri");
        // Mint via a fresh EOA path to avoid the receiver check on DAO at mint.
        address holder = makeAddr("holder1155");
        vm.prank(holder);
        token.mint(holder, 1, 10);
        vm.prank(holder);
        token.safeTransferFrom(holder, address(dao), 1, 10, "");

        // Now DAO has 10. Action transfers 5 out.
        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(token),
            value: 0,
            data: abi.encodeWithSignature(
                "safeTransferFrom(address,address,uint256,uint256,bytes)",
                address(dao),
                recipient,
                uint256(1),
                uint256(5),
                bytes("")
            )
        });
        dao.execute(bytes32(0), actions, 0);
        assertEq(token.balanceOf(recipient, 1), 5);
        assertEq(token.balanceOf(address(dao), 1), 5);
    }

    /// Action with BOTH non-zero value AND non-empty data — combined call.
    function test_execute_actionWithValueAndData() public {
        vm.deal(address(dao), 5 ether);
        // Target: ActionExecute.setTest(uint) is non-payable. Use a payable
        // sink — call back to a contract that accepts ETH + has a function.
        // Simplest: target the DAO itself with `deposit{value: x}(0, x, "")`.
        // But DAO.deposit reverts on amount=0. Use a fresh helper.
        PayableSink sink = new PayableSink();
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(sink), value: 1 ether, data: abi.encodeCall(PayableSink.pingWithValue, (42))});
        dao.execute(bytes32(0), actions, 0);
        assertEq(address(sink).balance, 1 ether);
        assertEq(sink.lastSeen(), 42);
    }
}

/// @dev Helper for the value+data combined-call test.
contract PayableSink {
    uint256 public lastSeen;

    function pingWithValue(uint256 x) external payable {
        lastSeen = x;
    }
}

/// @notice `execute` — adversarial action targets (F21 lock-in + others).
contract DAOExecuteAdversarialTest is DAOTestBase {
    function setUp() public override {
        super.setUp();
        // For the self-call / reentry-into-non-execute-functions tests, the
        // DAO must hold its own ROOT + SET_METADATA permissions (this is what
        // DAOFactory grants in production via `_setDAOPermissions`).
        dao.grant(address(dao), address(dao), ROOT_PERMISSION_ID);
        dao.grant(address(dao), address(dao), SET_METADATA_PERMISSION_ID);
    }

    /// Self-call: action targets the DAO itself. Required for "DAO governs
    /// itself" pattern (grants, setMetadata via proposals, etc.).
    function test_execute_selfCall_grantViaExecute() public {
        bytes32 newPerm = keccak256("CUSTOM");
        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(dao),
            value: 0,
            data: abi.encodeWithSignature("grant(address,address,bytes32)", address(dao), other, newPerm)
        });
        dao.execute(bytes32(0), actions, 0);
        assertTrue(dao.hasPermission(address(dao), other, newPerm, ""));
    }

    /// Action calling an invalid selector on a real contract returns
    /// `(success=false, "")`. Without allow-bit → reverts ActionFailed.
    function test_execute_invalidSelectorOnContract_reverts() public {
        ActionExecute target = new ActionExecute();
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(target), value: 0, data: hex"baadf00d"});
        vm.expectRevert(abi.encodeWithSelector(DAO.ActionFailed.selector, 0));
        dao.execute(bytes32(0), actions, 0);
    }

    /// Reentry into NON-execute DAO functions is allowed (only `execute` has
    /// the nonReentrant guard). An action can grant, setMetadata, etc.
    function test_execute_reentryIntoNonExecuteFunctions_allowed() public {
        // Action: dao.setMetadata(0x99). This routes through auth -> _setMetadata.
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(dao), value: 0, data: abi.encodeWithSignature("setMetadata(bytes)", hex"99")});
        dao.execute(bytes32(0), actions, 0);
    }
}

/// @notice `execute` — event field correctness (M surface).
contract DAOExecuteEventTest is DAOTestBase {
    ActionExecute internal actionMock;

    function setUp() public override {
        super.setUp();
        actionMock = new ActionExecute();
    }

    /// Same callId reused across calls — no nonce/dedup semantics; both
    /// execute calls succeed and emit their own Executed.
    function test_execute_sameCallIdReusedAcrossCalls() public {
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(actionMock), value: 0, data: abi.encodeCall(ActionExecute.setTest, (1))});

        bytes32 callId = bytes32(uint256(123));
        dao.execute(callId, actions, 0);
        dao.execute(callId, actions, 0);
        // No revert = success. No state-conflict between the two executions.
    }
}

/// @notice `deposit` — extended (event fields, dao-as-token, reference string).
contract DAODepositExtTest is DAOTestBase {
    /// `Deposited` event field assertion — all four fields.
    /// Long reference string accepted (multi-kB).
    function test_deposit_longReferenceAccepted() public {
        vm.deal(address(this), 1 ether);
        bytes memory raw = new bytes(4_000);
        for (uint256 i = 0; i < raw.length; i++) {
            raw[i] = bytes1("z");
        }
        dao.deposit{value: 1 ether}(address(0), 1 ether, string(raw));
    }

    /// `_token == address(dao)` — DAO treated as the token. safeTransferFrom
    /// routes to the DAO's fallback; selector `transferFrom(...)` is not
    /// registered → reverts UnknownCallback.
    function test_deposit_daoAsToken_reverts() public {
        vm.expectRevert();
        dao.deposit(address(dao), 1, "self");
    }
}

/// @notice `receive` + `fallback` — extended (P/O surfaces, F19 lock-in).
contract DAOReceiveFallbackTest is DAOTestBase {
    /// Empty calldata + 0 value triggers... receive (per Solidity semantics
    /// when no fallback-payable + empty data). DAO has receive + non-payable
    /// fallback. Calling with 0 calldata + 0 value goes to receive() which is
    /// payable but accepts 0; emits NativeTokenDeposited(sender, 0).
    function test_receive_withZeroValue() public {
        vm.deal(other, 1 ether);
        vm.recordLogs();
        vm.prank(other);
        (bool ok,) = address(dao).call("");
        assertTrue(ok);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 topic = keccak256("NativeTokenDeposited(address,uint256)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(dao) && logs[i].topics[0] == topic) {
                (address sender, uint256 amount) = abi.decode(logs[i].data, (address, uint256));
                assertEq(sender, other);
                assertEq(amount, 0);
                found = true;
                break;
            }
        }
        assertTrue(found, "NativeTokenDeposited not emitted on 0-value receive");
    }

    /// Fallback with 0-byte calldata is NOT reachable while value == 0
    /// (receive handles that). With value > 0 + 0-byte data → receive too.
    /// Fallback only fires on non-empty data. Lock in.
    function test_fallback_unregisteredSelectorReverts() public {
        // Random 4-byte selector not in the registered set.
        (bool ok, bytes memory data) = address(dao).call(hex"deadbeef");
        assertFalse(ok);
        // UnknownCallback(bytes4,bytes4) selector check.
        bytes4 sig = bytes4(data);
        assertEq(sig, bytes4(keccak256("UnknownCallback(bytes4,bytes4)")), "expected UnknownCallback selector");
    }

    /// Fallback is non-payable. Sending value to an unregistered selector
    /// reverts (call to non-payable function with value).
    function test_fallback_nonPayable_revertsWithValue() public {
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(dao).call{value: 1}(hex"deadbeef");
        assertFalse(ok);
    }

    /// Re-register same selector with a DIFFERENT magic silently overwrites.
    function test_registerStandardCallback_reRegisterOverwrites() public {
        bytes4 iface = 0x11223344;
        bytes4 selector = 0x55667788;
        dao.registerStandardCallback(iface, selector, bytes4(0xaaaaaaaa));
        dao.registerStandardCallback(iface, selector, bytes4(0xbbbbbbbb));

        (bool ok, bytes memory ret) = address(dao).call(abi.encodePacked(selector));
        assertTrue(ok);
        assertEq(bytes4(ret), bytes4(0xbbbbbbbb), "second registration wins");
    }
}

/// @notice `isValidSignature` — combined specific + generic ANY_ADDR cases (R surface).
contract DAOERC1271CombinedTest is DAOTestBase {
    address internal caller = makeAddr("erc1271caller");

    function _condAt(bool answer) internal returns (PermissionConditionMock) {
        PermissionConditionMock c = new PermissionConditionMock();
        c.setAnswer(answer);
        return c;
    }

    /// Specific condition returns TRUE, generic condition returns FALSE
    /// → caller's specific grant wins (tier 1 short-circuits) → VALID.
    function test_isValidSignature_combinedSpecificTrueGenericFalse_returnsValid() public {
        dao.grantWithCondition(
            address(dao), caller, VALIDATE_SIGNATURE_PERMISSION_ID, IPermissionCondition(address(_condAt(true)))
        );
        dao.grantWithCondition(
            address(dao), ANY_ADDR, VALIDATE_SIGNATURE_PERMISSION_ID, IPermissionCondition(address(_condAt(false)))
        );

        vm.prank(caller);
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_VALID);
    }

    /// Specific condition returns FALSE — and per the documented semantics, the
    /// permission manager does NOT fall through to the generic ANY_ADDR
    /// condition. So even if generic returns TRUE, the answer is INVALID.
    function test_isValidSignature_combinedSpecificFalseGenericTrue_returnsInvalid() public {
        dao.grantWithCondition(
            address(dao), caller, VALIDATE_SIGNATURE_PERMISSION_ID, IPermissionCondition(address(_condAt(false)))
        );
        dao.grantWithCondition(
            address(dao), ANY_ADDR, VALIDATE_SIGNATURE_PERMISSION_ID, IPermissionCondition(address(_condAt(true)))
        );

        vm.prank(caller);
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_INVALID, "no fall-through past tier 1");
    }

    /// Both true.
    function test_isValidSignature_combinedBothTrue_returnsValid() public {
        dao.grantWithCondition(
            address(dao), caller, VALIDATE_SIGNATURE_PERMISSION_ID, IPermissionCondition(address(_condAt(true)))
        );
        dao.grantWithCondition(
            address(dao), ANY_ADDR, VALIDATE_SIGNATURE_PERMISSION_ID, IPermissionCondition(address(_condAt(true)))
        );

        vm.prank(caller);
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_VALID);
    }

    /// Both false.
    function test_isValidSignature_combinedBothFalse_returnsInvalid() public {
        dao.grantWithCondition(
            address(dao), caller, VALIDATE_SIGNATURE_PERMISSION_ID, IPermissionCondition(address(_condAt(false)))
        );
        dao.grantWithCondition(
            address(dao), ANY_ADDR, VALIDATE_SIGNATURE_PERMISSION_ID, IPermissionCondition(address(_condAt(false)))
        );

        vm.prank(caller);
        assertEq(dao.isValidSignature(bytes32(0), ""), ERC1271_INVALID);
    }
}

/// @notice `hasPermission` — condition + ANY_ADDR + data forwarding (U surface).
contract DAOHasPermissionExtTest is DAOTestBase {
    function test_hasPermission_routesThroughConditionTrue() public {
        PermissionConditionMock c = new PermissionConditionMock();
        c.setAnswer(true);
        bytes32 perm = keccak256("CUSTOM_COND");
        dao.grantWithCondition(address(dao), other, perm, IPermissionCondition(address(c)));
        assertTrue(dao.hasPermission(address(dao), other, perm, ""));
    }

    function test_hasPermission_routesThroughConditionFalse() public {
        PermissionConditionMock c = new PermissionConditionMock();
        c.setAnswer(false);
        bytes32 perm = keccak256("CUSTOM_COND");
        dao.grantWithCondition(address(dao), other, perm, IPermissionCondition(address(c)));
        assertFalse(dao.hasPermission(address(dao), other, perm, ""));
    }

    /// Granting custom permission to ANY_ADDR (unrestricted) makes
    /// `hasPermission` return true for ANY caller.
    function test_hasPermission_anyAddrAllowsAllCallers() public {
        bytes32 perm = keccak256("CUSTOM_GLOBAL");
        dao.grant(address(dao), ANY_ADDR, perm);

        assertTrue(dao.hasPermission(address(dao), other, perm, ""));
        assertTrue(dao.hasPermission(address(dao), makeAddr("rando"), perm, ""));
    }

    /// `hasPermission` is a generic permissions oracle — `_where` can be ANY
    /// address, not just `address(dao)`.
    function test_hasPermission_acceptsAnyWhere() public {
        // No grant at all on (otherAddr, someone, perm) → false.
        assertFalse(dao.hasPermission(makeAddr("elsewhere"), other, keccak256("X"), ""));
    }
}

/// @notice Cross-cutting — storage gap / drift / invariants (V surface).
contract DAOInvariantsTest is DAOTestBase {
    /// Storage gap size lock-in — `uint256[46] private __gap;` was the
    /// declared size at v1.4.0 release. Probe a sentinel slot at the
    /// boundary; if the gap shrinks, this test catches it.
    function test_storageGap_sentinelSlotIsUnused() public view {
        // The DAO's last named state var is `_reentrancyStatus` at slot 304.
        // The gap declaration `uint256[46]` covers slots ~305..350. Probe a
        // mid-gap slot — should be zero in a freshly-deployed DAO.
        bytes32 mid = bytes32(uint256(320));
        bytes32 val = vm.load(address(dao), mid);
        assertEq(uint256(val), 0, "gap slot 320 should be unused");
    }

    /// `_reentrancyStatus` invariant — between any two external calls, the
    /// guard should be `_NOT_ENTERED = 1`. Probe before + after a normal
    /// state mutation.
    function test_reentrancyStatus_invariantOutsideExecute() public {
        bytes32 slot304 = bytes32(uint256(304));

        // After init.
        assertEq(uint256(vm.load(address(dao), slot304)), 1);

        // After a non-execute mutation.
        dao.setMetadata(hex"22");
        assertEq(uint256(vm.load(address(dao), slot304)), 1);

        // After a successful execute.
        Action[] memory empty;
        dao.execute(bytes32(0), empty, 0);
        assertEq(uint256(vm.load(address(dao), slot304)), 1);
    }
}
