// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./erc1271/ERC1271.sol";
import "./erc165/AdaptiveERC165.sol";
import "./acl/ACL.sol";
import "./IDAO.sol";

/// @title The public interface of the Aragon DAO framework.
/// @author Aragon Association - 2021
/// @notice This contract is the entry point to the Aragon DAO framework and provides our users a simple and easy to use public interface.
/// @dev Public API of the Aragon DAO framework
contract DAO is IDAO, Initializable, UUPSUpgradeable, ACL, ERC1271, AdaptiveERC165 {
    using SafeERC20 for ERC20;
    using Address for address;

    // Roles
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");
    bytes32 public constant DAO_CONFIG_ROLE = keccak256("DAO_CONFIG_ROLE");
    bytes32 public constant EXEC_ROLE = keccak256("EXEC_ROLE");
    bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");
    bytes32 public constant SET_SIGNATURE_VALIDATOR_ROLE =
        keccak256("SET_SIGNATURE_VALIDATOR_ROLE");
    bytes32 public constant MODIFY_TRUSTED_FORWARDER = keccak256("MODIFY_TRUSTED_FORWARDER");
    bytes32 public constant DAO_SET_PLUGIN_ROLE = keccak256("DAO_SET_PLUGIN_ROLE");

    ERC1271 signatureValidator;

    address private _trustedForwarder;

    mapping(bytes32 => address) installedPlugins; // keccak256({node, version, count}) => proxyAddress

    /// @notice Thrown if action execution has failed
    error ActionFailed();

    /// @notice Thrown if the deposit or withdraw amount is zero
    error ZeroAmount();

    /// @notice Thrown if the expected and actually deposited ETH amount mismatch
    /// @param expected Expected ETH amount
    /// @param actual Actual ETH amount
    error ETHDepositAmountMismatch(uint256 expected, uint256 actual);

    /// @notice Thrown if an ETH withdraw fails
    error ETHWithdrawFailed();

    /// @dev Used for UUPS upgradability pattern
    /// @param _metadata IPFS hash that points to all the metadata (logo, description, tags, etc.) of a DAO
    function initialize(
        bytes calldata _metadata,
        address _initialOwner,
        address _forwarder
    ) external initializer {
        _registerStandard(DAO_INTERFACE_ID);
        _registerStandard(type(ERC1271).interfaceId);

        _setMetadata(_metadata);
        _setTrustedForwarder(_forwarder);
        __ACL_init(_initialOwner);
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address)
        internal
        virtual
        override
        auth(address(this), UPGRADE_ROLE)
    {}

    /// @inheritdoc IDAO
    function setTrustedForwarder(address _newTrustedForwarder)
        external
        override
        auth(address(this), MODIFY_TRUSTED_FORWARDER)
    {
        _setTrustedForwarder(_newTrustedForwarder);
    }

    /// @inheritdoc IDAO
    function trustedForwarder() public view virtual override returns (address) {
        return _trustedForwarder;
    }

    /// @inheritdoc IDAO
    function hasPermission(
        address _where,
        address _who,
        bytes32 _role,
        bytes memory _data
    ) external override returns (bool) {
        return willPerform(_where, _who, _role, _data);
    }

    /// @inheritdoc IDAO
    function setMetadata(bytes calldata _metadata)
        external
        override
        auth(address(this), DAO_CONFIG_ROLE)
    {
        _setMetadata(_metadata);
    }

    function setPlugin(DAOPlugin memory _daoPlugin, address _proxyAddress)
        external
        override
        auth(address(this), DAO_SET_PLUGIN_ROLE)
    {
        bytes32 pluginHash = keccak256(
            abi.encodePacked(_daoPlugin.node, _daoPlugin.semanticVersion, _daoPlugin.count)
        );

        require(
            installedPlugins[pluginHash] == address(0),
            "Can not install the with the same index twice"
        );

        installedPlugins[pluginHash] = _proxyAddress;

        emit PluginSet(_proxyAddress, _daoPlugin);
    }

    /// @inheritdoc IDAO
    function execute(uint256 callId, Action[] memory _actions)
        external
        override
        auth(address(this), EXEC_ROLE)
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
                revert ETHDepositAmountMismatch({expected: _amount, actual: msg.value});
        } else {
            if (msg.value != 0) revert ETHDepositAmountMismatch({expected: 0, actual: msg.value});

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
    ) external override auth(address(this), WITHDRAW_ROLE) {
        if (_amount == 0) revert ZeroAmount();

        if (_token == address(0)) {
            (bool ok, ) = _to.call{value: _amount}("");
            if (!ok) revert ETHWithdrawFailed();
        } else {
            ERC20(_token).safeTransfer(_to, _amount);
        }

        emit Withdrawn(_token, _to, _amount, _reference);
    }

    /// @inheritdoc IDAO
    function setSignatureValidator(address _signatureValidator)
        external
        override
        auth(address(this), SET_SIGNATURE_VALIDATOR_ROLE)
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

    /// @dev Emits ETHDeposited event to track ETH deposits that weren't done over the deposit method.
    receive() external payable {
        emit ETHDeposited(msg.sender, msg.value);
    }

    /// @dev Fallback to handle future versions of the ERC165 standard.
    fallback() external {
        _handleCallback(msg.sig, msg.data); // WARN: does a low-level return, any code below would be unreacheable
    }

    /// @notice Emits the MetadataSet event if new metadata is set
    /// @param _metadata Hash of the IPFS metadata object
    function _setMetadata(bytes calldata _metadata) internal {
        emit MetadataSet(_metadata);
    }

    /// @notice Sets the trusted forwarder on the DAO and emits the associated event
    /// @param _forwarder Address of the forwarder
    function _setTrustedForwarder(address _forwarder) internal {
        _trustedForwarder = _forwarder;

        emit TrustedForwarderSet(_forwarder);
    }
}
