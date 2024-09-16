// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165StorageUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

import {IProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/IProtocolVersion.sol";
import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {VersionComparisonLib} from "@aragon/osx-commons-contracts/src/utils/versioning/VersionComparisonLib.sol";
import {hasBit, flipBit} from "@aragon/osx-commons-contracts/src/utils/math/BitMap.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

import {PermissionManager} from "../permission/PermissionManager.sol";
import {CallbackHandler} from "../utils/CallbackHandler.sol";
import {IEIP4824} from "./IEIP4824.sol";

/// @title DAO
/// @author Aragon X - 2021-2023
/// @notice This contract is the entry point to the Aragon DAO framework and provides our users a simple and easy to use public interface.
/// @dev Public API of the Aragon DAO framework.
/// @custom:security-contact sirt@aragon.org
/// @custom:oz-upgrades-unsafe-allow constructor constructor delegatecall
contract DAO is
    IEIP4824,
    Initializable,
    IERC1271,
    ERC165StorageUpgradeable,
    IDAO,
    UUPSUpgradeable,
    ProtocolVersion,
    PermissionManager,
    CallbackHandler
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;
    using VersionComparisonLib for uint8[3];

    /// @notice The ID of the permission required to call the `execute` function.
    bytes32 public constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");

    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_DAO_PERMISSION_ID = keccak256("UPGRADE_DAO_PERMISSION");

    /// @notice The ID of the permission required to call the `setMetadata` function.
    bytes32 public constant SET_METADATA_PERMISSION_ID = keccak256("SET_METADATA_PERMISSION");

    /// @notice The ID of the permission required to call the `setTrustedForwarder` function.
    bytes32 public constant SET_TRUSTED_FORWARDER_PERMISSION_ID =
        keccak256("SET_TRUSTED_FORWARDER_PERMISSION");

    /// @notice The ID of the permission required to call the `registerStandardCallback` function.
    bytes32 public constant REGISTER_STANDARD_CALLBACK_PERMISSION_ID =
        keccak256("REGISTER_STANDARD_CALLBACK_PERMISSION");

    /// @notice The ID of the permission required to validate [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signatures.
    bytes32 public constant VALIDATE_SIGNATURE_PERMISSION_ID =
        keccak256("VALIDATE_SIGNATURE_PERMISSION");

    /// @notice The internal constant storing the maximal action array length.
    uint256 internal constant MAX_ACTIONS = 256;

    /// @notice The first out of two values to which the `_reentrancyStatus` state variable (used by the `nonReentrant` modifier) can be set indicating that a function was not entered.
    uint256 private constant _NOT_ENTERED = 1;

    /// @notice The second out of two values to which the `_reentrancyStatus` state variable (used by the `nonReentrant` modifier) can be set indicating that a function was entered.
    uint256 private constant _ENTERED = 2;

    /// @notice Removed variable that is left here to maintain the storage layout.
    /// @dev Introduced in v1.0.0. Removed in v1.4.0.
    /// @custom:oz-renamed-from signatureValidator
    address private __removed0;

    /// @notice The address of the trusted forwarder verifying meta transactions.
    /// @dev Added in v1.0.0.
    address private trustedForwarder;

    /// @notice The [EIP-4824](https://eips.ethereum.org/EIPS/eip-4824) DAO URI.
    /// @dev Added in v1.0.0.
    string private _daoURI;

    /// @notice The state variable for the reentrancy guard of the `execute` function.
    /// @dev Added in v1.3.0. The variable can be of value `_NOT_ENTERED = 1` or `_ENTERED = 2` in usage and is initialized with `_NOT_ENTERED`.
    uint256 private _reentrancyStatus;

    /// @notice Thrown if a call is reentrant.
    error ReentrantCall();

    /// @notice Thrown if the action array length is larger than `MAX_ACTIONS`.
    error TooManyActions();

    /// @notice Thrown if action execution has failed.
    /// @param index The index of the action in the action array that failed.
    error ActionFailed(uint256 index);

    /// @notice Thrown if an action has insufficient gas left.
    error InsufficientGas();

    /// @notice Thrown if the deposit amount is zero.
    error ZeroAmount();

    /// @notice Thrown if there is a mismatch between the expected and actually deposited amount of native tokens.
    /// @param expected The expected native token amount.
    /// @param actual The actual native token amount deposited.
    error NativeTokenDepositAmountMismatch(uint256 expected, uint256 actual);

    /// @notice Thrown if an upgrade is not supported from a specific protocol version .
    error ProtocolVersionUpgradeNotSupported(uint8[3] protocolVersion);

    /// @notice Thrown when a function is removed but left to not corrupt the interface ID.
    error FunctionRemoved();

    /// @notice Emitted when a new DAO URI is set.
    /// @param daoURI The new URI.
    event NewURI(string daoURI);

    /// @notice A modifier to protect a function from calling itself, directly or indirectly (reentrancy).
    /// @dev Currently, this modifier is only applied to the `execute()` function. If this is used multiple times, private `_beforeNonReentrant()` and `_afterNonReentrant()` functions should be created to prevent code duplication.
    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) {
            revert ReentrantCall();
        }
        _reentrancyStatus = _ENTERED;

        _;

        _reentrancyStatus = _NOT_ENTERED;
    }

    /// @notice Disables the initializers on the implementation contract to prevent it from being left uninitialized.
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the DAO by
    /// - setting the reentrancy status variable to `_NOT_ENTERED`
    /// - registering the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID
    /// - setting the trusted forwarder for meta transactions
    /// - giving the `ROOT_PERMISSION_ID` permission to the initial owner (that should be revoked and transferred to the DAO after setup).
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _metadata IPFS hash that points to all the metadata (logo, description, tags, etc.) of a DAO.
    /// @param _initialOwner The initial owner of the DAO having the `ROOT_PERMISSION_ID` permission.
    /// @param _trustedForwarder The trusted forwarder responsible for verifying meta transactions.
    /// @param daoURI_ The DAO URI required to support [ERC-4824](https://eips.ethereum.org/EIPS/eip-4824).
    function initialize(
        bytes calldata _metadata,
        address _initialOwner,
        address _trustedForwarder,
        string calldata daoURI_
    ) external reinitializer(3) {
        _reentrancyStatus = _NOT_ENTERED; // added in v1.3.0

        _registerInterface(type(IDAO).interfaceId);
        _registerInterface(type(IERC1271).interfaceId);
        _registerInterface(type(IEIP4824).interfaceId);
        _registerInterface(type(IProtocolVersion).interfaceId); // added in v1.3.0
        _registerTokenInterfaces();

        _setMetadata(_metadata);
        _setTrustedForwarder(_trustedForwarder);
        _setDaoURI(daoURI_);
        __PermissionManager_init(_initialOwner);
    }

    /// @notice Initializes the DAO after an upgrade from a previous protocol version.
    /// @param _previousProtocolVersion The semantic protocol version number of the previous DAO implementation contract this upgrade is transitioning from.
    /// @param _initData The initialization data to be passed to via `upgradeToAndCall` (see [ERC-1967](https://docs.openzeppelin.com/contracts/4.x/api/proxy#ERC1967Upgrade)).
    function initializeFrom(
        uint8[3] calldata _previousProtocolVersion,
        bytes calldata _initData
    ) external reinitializer(3) {
        _initData; // Silences the unused function parameter warning.

        // Check that the contract is not upgrading from a different major release.
        if (_previousProtocolVersion[0] != 1) {
            revert ProtocolVersionUpgradeNotSupported(_previousProtocolVersion);
        }

        // Initialize `_reentrancyStatus` that was added in v1.3.0.
        // Register Interface `ProtocolVersion` that was added in v1.3.0.
        if (_previousProtocolVersion.lt([1, 3, 0])) {
            _reentrancyStatus = _NOT_ENTERED;
            _registerInterface(type(IProtocolVersion).interfaceId);
        }

        // Revoke the `SET_SIGNATURE_VALIDATOR_PERMISSION` that was deprecated in v1.4.0.
        if (_previousProtocolVersion.lt([1, 4, 0])) {
            _revoke({
                _where: address(this),
                _who: address(this),
                _permissionId: keccak256("SET_SIGNATURE_VALIDATOR_PERMISSION")
            });
        }
    }

    /// @inheritdoc PermissionManager
    function isPermissionRestrictedForAnyAddr(
        bytes32 _permissionId
    ) internal pure override returns (bool) {
        return
            _permissionId == EXECUTE_PERMISSION_ID ||
            _permissionId == UPGRADE_DAO_PERMISSION_ID ||
            _permissionId == SET_METADATA_PERMISSION_ID ||
            _permissionId == SET_TRUSTED_FORWARDER_PERMISSION_ID ||
            _permissionId == REGISTER_STANDARD_CALLBACK_PERMISSION_ID;
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_DAO_PERMISSION_ID` permission.
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_DAO_PERMISSION_ID) {}

    /// @inheritdoc IDAO
    function setTrustedForwarder(
        address _newTrustedForwarder
    ) external override auth(SET_TRUSTED_FORWARDER_PERMISSION_ID) {
        _setTrustedForwarder(_newTrustedForwarder);
    }

    /// @inheritdoc IDAO
    function getTrustedForwarder() external view virtual override returns (address) {
        return trustedForwarder;
    }

    /// @inheritdoc IDAO
    function hasPermission(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) external view override returns (bool) {
        return isGranted({_where: _where, _who: _who, _permissionId: _permissionId, _data: _data});
    }

    /// @inheritdoc IDAO
    function setMetadata(
        bytes calldata _metadata
    ) external override auth(SET_METADATA_PERMISSION_ID) {
        _setMetadata(_metadata);
    }

    /// @inheritdoc IDAO
    function execute(
        bytes32 _callId,
        Action[] calldata _actions,
        uint256 _allowFailureMap
    ) external override nonReentrant returns (bytes[] memory execResults, uint256 failureMap) {
        // Check that the action array length is within bounds.
        if (_actions.length > MAX_ACTIONS) {
            revert TooManyActions();
        }

        execResults = new bytes[](_actions.length);

        uint256 gasBefore;
        uint256 gasAfter;

        bool hasExecutePermission = isGranted(
            address(this),
            msg.sender,
            EXECUTE_PERMISSION_ID,
            msg.data
        );

        for (uint256 i = 0; i < _actions.length; i++) {
            // TODO: Merge this loop with the below one.
            Action calldata action = _actions[i];

            bool isAllowed = hasExecutePermission;
            bytes32 permissionId = EXECUTE_PERMISSION_ID;

            // TODO: do we want to have some special way to allow registering permission for `transfer` out of this contract ?
            // This could be useful as there's no function selector for such scenario and currently, to do transfer, EXECUTE_PERMISSION
            // is enough, but it could be desirable that some special permission is created and even if member has EXECUTE, still won't be able
            // to execute withdraw action.
            if (action.data.length >= 4) {
                bytes32 id = keccak256(action.data[:4]);
                Permission storage targetPermission = permissions[permissionHash(action.to, id)];

                if (targetPermission.created) {
                    isAllowed = isGranted(action.to, msg.sender, id, action.data);
                    permissionId = id;
                }
            }

            if (!isAllowed) {
                revert Unauthorized(action.to, msg.sender, permissionId);
            }
        }

        for (uint256 i = 0; i < _actions.length; ) {
            bool success;
            bytes memory data;

            gasBefore = gasleft();

            (success, data) = _actions[i].to.call{value: _actions[i].value}(_actions[i].data);

            gasAfter = gasleft();

            if (_actions[i].to == address(this)) {
                if (!success) {
                    bytes4 result;

                    assembly {
                        result := mload(add(data, 32))
                    }

                    if (result == Unauthorized.selector || result == UnauthorizedOwner.selector) {
                        gasBefore = gasleft();
                        (success, data) = _actions[i].to.delegatecall(_actions[i].data);
                        gasAfter = gasleft();
                    }
                }
            }

            // Check if failure is allowed
            if (!hasBit(_allowFailureMap, uint8(i))) {
                // Check if the call failed.
                if (!success) {
                    revert ActionFailed(i);
                }
            } else {
                // Check if the call failed.
                if (!success) {
                    // Make sure that the action call did not fail because 63/64 of `gasleft()` was insufficient to execute the external call `.to.call` (see [ERC-150](https://eips.ethereum.org/EIPS/eip-150)).
                    // In specific scenarios, i.e. proposal execution where the last action in the action array is allowed to fail, the account calling `execute` could force-fail this action by setting a gas limit
                    // where 63/64 is insufficient causing the `.to.call` to fail, but where the remaining 1/64 gas are sufficient to successfully finish the `execute` call.
                    if (gasAfter < gasBefore / 64) {
                        revert InsufficientGas();
                    }

                    // Store that this action failed.
                    failureMap = flipBit(failureMap, uint8(i));
                }
            }

            execResults[i] = data;

            unchecked {
                ++i;
            }
        }

        emit Executed({
            actor: msg.sender,
            callId: _callId,
            actions: _actions,
            allowFailureMap: _allowFailureMap,
            failureMap: failureMap,
            execResults: execResults
        });
    }

    /// @inheritdoc IDAO
    function deposit(
        address _token,
        uint256 _amount,
        string calldata _reference
    ) external payable override {
        if (_amount == 0) revert ZeroAmount();

        if (_token == address(0)) {
            if (msg.value != _amount)
                revert NativeTokenDepositAmountMismatch({expected: _amount, actual: msg.value});
        } else {
            if (msg.value != 0)
                revert NativeTokenDepositAmountMismatch({expected: 0, actual: msg.value});

            IERC20Upgradeable(_token).safeTransferFrom(msg.sender, address(this), _amount);
        }

        emit Deposited(msg.sender, _token, _amount, _reference);
    }

    /// @inheritdoc IDAO
    function setSignatureValidator(address) external pure override {
        revert FunctionRemoved();
    }

    /// @inheritdoc IDAO
    /// @dev Relays the validation logic determining who is allowed to sign on behalf of the DAO to its permission manager.
    /// Caller specific bypassing can be set direct granting (i.e., `grant({_where: dao, _who: specificErc1271Caller, _permissionId: VALIDATE_SIGNATURE_PERMISSION_ID})`).
    /// Caller specific signature validation logic can be set by granting with a `PermissionCondition` (i.e., `grantWithCondition({_where: dao, _who: specificErc1271Caller, _permissionId: VALIDATE_SIGNATURE_PERMISSION_ID, _condition: yourConditionImplementation})`)
    /// Generic signature validation logic can be set for all calling contracts by granting with a `PermissionCondition` to `PermissionManager.ANY_ADDR()` (i.e., `grantWithCondition({_where: dao, _who: PermissionManager.ANY_ADDR(), _permissionId: VALIDATE_SIGNATURE_PERMISSION_ID, _condition: yourConditionImplementation})`).
    function isValidSignature(
        bytes32 _hash,
        bytes memory _signature
    ) external view override(IDAO, IERC1271) returns (bytes4) {
        if (
            isGranted({
                _where: address(this),
                _who: msg.sender,
                _permissionId: VALIDATE_SIGNATURE_PERMISSION_ID,
                _data: abi.encode(_hash, _signature)
            })
        ) {
            return 0x1626ba7e; // `type(IERC1271).interfaceId` = bytes4(keccak256("isValidSignature(bytes32,bytes)")`
        }
        return 0xffffffff; // `bytes4(uint32(type(uint32).max-1))`
    }

    /// @notice Emits the `NativeTokenDeposited` event to track native token deposits that weren't made via the deposit method.
    /// @dev This call is bound by the gas limitations for `send`/`transfer` calls introduced by [ERC-2929](https://eips.ethereum.org/EIPS/eip-2929).
    /// Gas cost increases in future hard forks might break this function. As an alternative, [ERC-2930](https://eips.ethereum.org/EIPS/eip-2930)-type transactions using access lists can be employed.
    receive() external payable {
        emit NativeTokenDeposited(msg.sender, msg.value);
    }

    /// @notice Fallback to handle future versions of the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) standard.
    /// @param _input An alias being equivalent to `msg.data`. This feature of the fallback function was introduced with the [solidity compiler version 0.7.6](https://github.com/ethereum/solidity/releases/tag/v0.7.6)
    /// @return The magic number registered for the function selector triggering the fallback.
    fallback(bytes calldata _input) external returns (bytes memory) {
        bytes4 magicNumber = _handleCallback(msg.sig, _input);
        return abi.encode(magicNumber);
    }

    /// @notice Emits the MetadataSet event if new metadata is set.
    /// @param _metadata Hash of the IPFS metadata object.
    function _setMetadata(bytes calldata _metadata) internal {
        emit MetadataSet(_metadata);
    }

    /// @notice Sets the trusted forwarder on the DAO and emits the associated event.
    /// @param _trustedForwarder The trusted forwarder address.
    function _setTrustedForwarder(address _trustedForwarder) internal {
        trustedForwarder = _trustedForwarder;

        emit TrustedForwarderSet(_trustedForwarder);
    }

    /// @notice Registers the [ERC-721](https://eips.ethereum.org/EIPS/eip-721) and [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155) interfaces and callbacks.
    function _registerTokenInterfaces() private {
        _registerInterface(type(IERC721ReceiverUpgradeable).interfaceId);
        _registerInterface(type(IERC1155ReceiverUpgradeable).interfaceId);

        _registerCallback(
            IERC721ReceiverUpgradeable.onERC721Received.selector,
            IERC721ReceiverUpgradeable.onERC721Received.selector
        );
        _registerCallback(
            IERC1155ReceiverUpgradeable.onERC1155Received.selector,
            IERC1155ReceiverUpgradeable.onERC1155Received.selector
        );
        _registerCallback(
            IERC1155ReceiverUpgradeable.onERC1155BatchReceived.selector,
            IERC1155ReceiverUpgradeable.onERC1155BatchReceived.selector
        );
    }

    /// @inheritdoc IDAO
    function registerStandardCallback(
        bytes4 _interfaceId,
        bytes4 _callbackSelector,
        bytes4 _magicNumber
    ) external override auth(REGISTER_STANDARD_CALLBACK_PERMISSION_ID) {
        _registerInterface(_interfaceId);
        _registerCallback(_callbackSelector, _magicNumber);
        emit StandardCallbackRegistered(_interfaceId, _callbackSelector, _magicNumber);
    }

    /// @inheritdoc IEIP4824
    function daoURI() external view returns (string memory) {
        return _daoURI;
    }

    /// @notice Updates the set DAO URI to a new value.
    /// @param newDaoURI The new DAO URI to be set.
    function setDaoURI(string calldata newDaoURI) external auth(SET_METADATA_PERMISSION_ID) {
        _setDaoURI(newDaoURI);
    }

    /// @notice Sets the new [ERC-4824](https://eips.ethereum.org/EIPS/eip-4824) DAO URI and emits the associated event.
    /// @param daoURI_ The new DAO URI.
    function _setDaoURI(string calldata daoURI_) internal {
        _daoURI = daoURI_;

        emit NewURI(daoURI_);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZeppelin's guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[46] private __gap;
}
