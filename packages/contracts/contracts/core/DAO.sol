// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";

import "./component/CallbackHandler.sol";
import "./permission/PermissionManager.sol";
import "./IDAO.sol";
import {getIndex, setIndex} from "../utils/BitMap.sol";

/// @title DAO
/// @author Aragon Association - 2021
/// @notice This contract is the entry point to the Aragon DAO framework and provides our users a simple and easy to use public interface.
/// @dev Public API of the Aragon DAO framework.
contract DAO is
    Initializable,
    IERC1271,
    ERC165StorageUpgradeable,
    IDAO,
    UUPSUpgradeable,
    PermissionManager,
    CallbackHandler
{
    using SafeERC20 for ERC20;
    using Address for address;

    /// @notice The ID of the permission required to call the `execute` function.
    bytes32 public constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");

    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_DAO_PERMISSION_ID = keccak256("UPGRADE_DAO_PERMISSION");

    /// @notice The ID of the permission required to call the `setMetadata` function.
    bytes32 public constant SET_METADATA_PERMISSION_ID = keccak256("SET_METADATA_PERMISSION");

    /// @notice The ID of the permission required to call the `withdraw` function.
    bytes32 public constant WITHDRAW_PERMISSION_ID = keccak256("WITHDRAW_PERMISSION");

    /// @notice The ID of the permission required to call the `setTrustedForwarder` function.
    bytes32 public constant SET_TRUSTED_FORWARDER_PERMISSION_ID =
        keccak256("SET_TRUSTED_FORWARDER_PERMISSION");

    /// @notice The ID of the permission required to call the `setSignatureValidator` function.
    bytes32 public constant SET_SIGNATURE_VALIDATOR_PERMISSION_ID =
        keccak256("SET_SIGNATURE_VALIDATOR_PERMISSION");

    /// @notice The ID of the permission required to call the `registerStandardCallback` function.
    bytes32 public constant REGISTER_STANDARD_CALLBACK_PERMISSION_ID =
        keccak256("REGISTER_STANDARD_CALLBACK_PERMISSION");

    /// @notice Only allows 256 actions to execute per tx.
    uint256 internal constant MAX_ACTIONS = 256;

    /// @notice The [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature validator contract.
    IERC1271 public signatureValidator;

    /// @notice The address of the trusted forwarder verifying meta transactions.
    address private trustedForwarder;

    /// @notice Thrown if action length is more than MAX_ACTIONS.
    error TooManyActions();

    /// @notice Thrown if Action succeeds, but was called on EOA.
    error NotAContract();

    /// @notice Thrown if action execution has failed.
    error ActionFailed();

    /// @notice Thrown if the deposit or withdraw amount is zero.
    error ZeroAmount();

    /// @notice Thrown if there is a mismatch between the expected and actually deposited amount of native tokens.
    /// @param expected The expected native token amount.
    /// @param actual The actual native token amount deposited.
    error NativeTokenDepositAmountMismatch(uint256 expected, uint256 actual);

    /// @notice Thrown if a native token withdraw fails.
    error NativeTokenWithdrawFailed();

    /// @notice Initializes the DAO by
    /// - registering the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID
    /// - setting the trusted forwarder for meta transactions
    /// - giving the `ROOT_PERMISSION_ID` permission to the initial owner (that should be revoked and transferred to the DAO after setup).
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _metadata IPFS hash that points to all the metadata (logo, description, tags, etc.) of a DAO.
    /// @param _initialOwner The initial owner of the DAO having the `ROOT_PERMISSION_ID` permission.
    /// @param _trustedForwarder The trusted forwarder responsible for verifying meta transactions.
    function initialize(
        bytes calldata _metadata,
        address _initialOwner,
        address _trustedForwarder
    ) external initializer {
        _registerInterface(type(IDAO).interfaceId);
        _registerInterface(type(IERC1271).interfaceId);

        _setMetadata(_metadata);
        _setTrustedForwarder(_trustedForwarder);
        __PermissionManager_init(_initialOwner);
    }

    /// @inheritdoc PermissionManager
    function isPermissionRestrictedForAnyAddr(bytes32 _permissionId)
        internal
        view
        virtual
        override
        returns (bool)
    {
        return
            _permissionId == EXECUTE_PERMISSION_ID ||
            _permissionId == UPGRADE_DAO_PERMISSION_ID ||
            _permissionId == SET_METADATA_PERMISSION_ID ||
            _permissionId == WITHDRAW_PERMISSION_ID ||
            _permissionId == SET_SIGNATURE_VALIDATOR_PERMISSION_ID ||
            _permissionId == REGISTER_STANDARD_CALLBACK_PERMISSION_ID;
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_DAO_PERMISSION_ID` permission.
    function _authorizeUpgrade(address)
        internal
        virtual
        override
        auth(address(this), UPGRADE_DAO_PERMISSION_ID)
    {}

    /// @inheritdoc IDAO
    function setTrustedForwarder(address _newTrustedForwarder)
        external
        override
        auth(address(this), SET_TRUSTED_FORWARDER_PERMISSION_ID)
    {
        _setTrustedForwarder(_newTrustedForwarder);
    }

    /// @inheritdoc IDAO
    function getTrustedForwarder() public view virtual override returns (address) {
        return trustedForwarder;
    }

    /// @inheritdoc IDAO
    function hasPermission(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) external view override returns (bool) {
        return isGranted(_where, _who, _permissionId, _data);
    }

    /// @inheritdoc IDAO
    function setMetadata(bytes calldata _metadata)
        external
        override
        auth(address(this), SET_METADATA_PERMISSION_ID)
    {
        _setMetadata(_metadata);
    }

    /// @inheritdoc IDAO
    function execute(uint256 callId, Action[] calldata _actions, uint256 allowFailureMap)
        external
        override
        auth(address(this), EXECUTE_PERMISSION_ID)
        returns (bytes[] memory execResults, uint256 failureMap)
    {
        if(_actions.length > MAX_ACTIONS) {
            revert TooManyActions();
        }

        execResults = new bytes[](_actions.length);

        for (uint256 i = 0; i < _actions.length;) {
            address to = _actions[i].to;
            (bool success, bytes memory response) = to.call{value: _actions[i].value}(
                _actions[i].data
            );

            if(success) {
                // If the call succeeded, and returned response.length > 0, means it was a contract
                // otherwise, it was called on a EOA, in which case we should fail it.
                if(response.length == 0 && !to.isContract()) {
                    revert NotAContract();
                }
            }

            if (!success && !getIndex(allowFailureMap, i))  {
                revert ActionFailed();
            }

            // If it comes here, it means the action was whitelisted, but failed
            // for which we need to store that it failed.
            if(!success) {
                failureMap = setIndex(failureMap, i);
            }

            execResults[i] = response;

            unchecked {
                i++;
            }
        }

        emit Executed(msg.sender, callId, _actions, failureMap, execResults);

        return (execResults, failureMap);
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

            ERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        }

        emit Deposited(msg.sender, _token, _amount, _reference);
    }

    /// @inheritdoc IDAO
    function withdraw(
        address _token,
        address _to,
        uint256 _amount,
        string memory _reference
    ) external override auth(address(this), WITHDRAW_PERMISSION_ID) {
        if (_amount == 0) revert ZeroAmount();

        if (_token == address(0)) {
            (bool ok, ) = _to.call{value: _amount}("");
            if (!ok) revert NativeTokenWithdrawFailed();
        } else {
            ERC20(_token).safeTransfer(_to, _amount);
        }

        emit Withdrawn(_token, _to, _amount, _reference);
    }

    /// @inheritdoc IDAO
    function setSignatureValidator(address _signatureValidator)
        external
        override
        auth(address(this), SET_SIGNATURE_VALIDATOR_PERMISSION_ID)
    {
        signatureValidator = IERC1271(_signatureValidator);

        emit SignatureValidatorSet({signatureValidator: _signatureValidator});
    }

    /// @inheritdoc IDAO
    function isValidSignature(bytes32 _hash, bytes memory _signature)
        external
        view
        override(IDAO, IERC1271)
        returns (bytes4)
    {
        if (address(signatureValidator) == address(0)) return bytes4(0); // invalid magic number
        return signatureValidator.isValidSignature(_hash, _signature); // forward call to set validation contract
    }

    /// @notice Emits the `NativeTokenDeposited` event to track native token deposits that weren't made via the deposit method.
    /// @dev This call is bound by the gas limitations for `send`/`transfer` calls introduced by EIP-2929.
    /// Gas cost increases in future hard forks might break this function. As an alternative, EIP-2930-type transactions using access lists can be employed.
    receive() external payable {
        emit NativeTokenDeposited(msg.sender, msg.value);
    }

    /// @notice Fallback to handle future versions of the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) standard.
    fallback() external {
        _handleCallback(msg.sig); // WARN: does a low-level return, any code below would be unreacheable
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

    /// @inheritdoc IDAO
    function registerStandardCallback(
        bytes4 _interfaceId,
        bytes4 _callbackSelector,
        bytes4 _magicNumber
    ) external override auth(address(this), REGISTER_STANDARD_CALLBACK_PERMISSION_ID) {
        _registerInterface(_interfaceId);
        _registerCallback(_callbackSelector, _magicNumber);
        emit StandardCallbackRegistered(_interfaceId, _callbackSelector, _magicNumber);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[48] private __gap;
}
