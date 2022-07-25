// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./erc1271/ERC1271.sol";
import "./erc165/AdaptiveERC165.sol";
import "./permission/PermissionManager.sol";
import "./IDAO.sol";

/// @title The public interface of the Aragon DAO framework.
/// @author Aragon Association - 2021
/// @notice This contract is the entry point to the Aragon DAO framework and provides our users a simple and easy to use public interface.
/// @dev Public API of the Aragon DAO framework.
contract DAO is IDAO, Initializable, UUPSUpgradeable, PermissionManager, ERC1271, AdaptiveERC165 {
    using SafeERC20 for ERC20;
    using Address for address;

    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    /// @notice The ID of the permission required to call the `setMetadata` function.
    bytes32 public constant SET_METADATA_PERMISSION_ID = keccak256("SET_METADATA_PERMISSION");

    /// @notice The ID of the permission required to call the `execute` function.
    bytes32 public constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");

    /// @notice The ID of the permission required to call the `withdraw` function.
    bytes32 public constant WITHDRAW_PERMISSION_ID = keccak256("WITHDRAW_PERMISSION");

    /// @notice The ID of the permission required to call the `setSignatureValidator` function.
    bytes32 public constant SET_SIGNATURE_VALIDATOR_PERMISSION_ID =
        keccak256("SET_SIGNATURE_VALIDATOR_PERMISSION");

    /// @notice The ID of the permission required to call the `setTrustedForwarder` function.
    bytes32 public constant SET_TRUSTED_FORWARDER_PERMISSION_ID =
        keccak256("SET_TRUSTED_FORWARDER_PERMISSION");

    /// @notice The [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature validator contract.
    ERC1271 signatureValidator;

    /// @notice The address of the trusted forwarder verifying meta transactions.
    address private trustedForwarder;

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
        _registerStandard(DAO_INTERFACE_ID);
        _registerStandard(type(ERC1271).interfaceId);

        _setMetadata(_metadata);
        _setTrustedForwarder(_trustedForwarder);
        __PermissionManager_init(_initialOwner);
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_PERMISSION_ID` permission.
    function _authorizeUpgrade(address)
        internal
        virtual
        override
        auth(address(this), UPGRADE_PERMISSION_ID)
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
        bytes32 _permissionID,
        bytes memory _data
    ) external override returns (bool) {
        return hasPermissions(_where, _who, _permissionID, _data);
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
    function execute(uint256 callId, Action[] memory _actions)
        external
        override
        auth(address(this), EXECUTE_PERMISSION_ID)
        returns (bytes[] memory)
    {
        bytes[] memory execResults = new bytes[](_actions.length);

        for (uint256 i = 0; i < _actions.length; i++) {
            (bool success, bytes memory response) = _actions[i].to.call{value: _actions[i].value}(
                _actions[i].data
            );

            if (!success) revert ActionFailed();

            execResults[i] = response;
        }

        emit Executed(msg.sender, callId, _actions, execResults);

        return execResults;
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
        signatureValidator = ERC1271(_signatureValidator);
    }

    /// @inheritdoc IDAO
    function isValidSignature(bytes32 _hash, bytes memory _signature)
        external
        view
        override(IDAO, ERC1271)
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
        _handleCallback(msg.sig, msg.data); // WARN: does a low-level return, any code below would be unreacheable
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
}
