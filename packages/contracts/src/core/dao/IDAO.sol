// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/// @title IDAO
/// @author Aragon Association - 2022-2023
/// @notice The interface required for DAOs within the Aragon App DAO framework.
interface IDAO {
    /// @notice The action struct to be consumed by the DAO's `execute` function resulting in an external call.
    /// @param to The address to call.
    /// @param value The native token value to be sent with the call.
    /// @param data The bytes-encoded function selector and calldata for the call.
    struct Action {
        address to;
        uint256 value;
        bytes data;
    }

    /// @notice Checks if an address has permission on a contract via a permission identifier and considers if `ANY_ADDRESS` was used in the granting process.
    /// @param _where The address of the contract.
    /// @param _who The address of a EOA or contract to give the permissions.
    /// @param _permissionId The permission identifier.
    /// @param _data The optional data passed to the `PermissionCondition` registered.
    /// @return Returns true if the address has permission, false if not.
    function hasPermission(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) external view returns (bool);

    /// @notice Updates the DAO metadata (e.g., an IPFS hash).
    /// @param _metadata The IPFS hash of the new metadata object.
    function setMetadata(bytes calldata _metadata) external;

    /// @notice Emitted when the DAO metadata is updated.
    /// @param metadata The IPFS hash of the new metadata object.
    event MetadataSet(bytes metadata);

    /// @notice Executes a list of actions. If a zero allow-failure map is provided, a failing action reverts the entire excution. If a non-zero allow-failure map is provided, allowed actions can fail without the entire call being reverted.
    /// @param _callId The ID of the call. The definition of the value of `callId` is up to the calling contract and can be used, e.g., as a nonce.
    /// @param _actions The array of actions.
    /// @param _allowFailureMap A bitmap allowing execution to succeed, even if individual actions might revert. If the bit at index `i` is 1, the execution succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert.
    /// @return The array of results obtained from the executed actions in `bytes`.
    /// @return The resulting failure map containing the actions have actually failed.
    function execute(
        bytes32 _callId,
        Action[] memory _actions,
        uint256 _allowFailureMap
    ) external returns (bytes[] memory, uint256);

    /// @notice Emitted when a proposal is executed.
    /// @param actor The address of the caller.
    /// @param callId The ID of the call.
    /// @param actions The array of actions executed.
    /// @param allowFailureMap The allow failure map encoding which actions are allowed to fail.
    /// @param failureMap The failure map encoding which actions have failed.
    /// @param execResults The array with the results of the executed actions.
    /// @dev The value of `callId` is defined by the component/contract calling the execute function. A `Plugin` implementation can use it, for example, as a nonce.
    event Executed(
        address indexed actor,
        bytes32 callId,
        Action[] actions,
        uint256 allowFailureMap,
        uint256 failureMap,
        bytes[] execResults
    );

    /// @notice Emitted when a standard callback is registered.
    /// @param interfaceId The ID of the interface.
    /// @param callbackSelector The selector of the callback function.
    /// @param magicNumber The magic number to be registered for the callback function selector.
    event StandardCallbackRegistered(
        bytes4 interfaceId,
        bytes4 callbackSelector,
        bytes4 magicNumber
    );

    /// @notice Deposits (native) tokens to the DAO contract with a reference string.
    /// @param _token The address of the token or address(0) in case of the native token.
    /// @param _amount The amount of tokens to deposit.
    /// @param _reference The reference describing the deposit reason.
    function deposit(address _token, uint256 _amount, string calldata _reference) external payable;

    /// @notice Emitted when a token deposit has been made to the DAO.
    /// @param sender The address of the sender.
    /// @param token The address of the deposited token.
    /// @param amount The amount of tokens deposited.
    /// @param _reference The reference describing the deposit reason.
    event Deposited(
        address indexed sender,
        address indexed token,
        uint256 amount,
        string _reference
    );

    /// @notice Emitted when a native token deposit has been made to the DAO.
    /// @dev This event is intended to be emitted in the `receive` function and is therefore bound by the gas limitations for `send`/`transfer` calls introduced by [ERC-2929](https://eips.ethereum.org/EIPS/eip-2929).
    /// @param sender The address of the sender.
    /// @param amount The amount of native tokens deposited.
    event NativeTokenDeposited(address sender, uint256 amount);

    /// @notice Setter for the trusted forwarder verifying the meta transaction.
    /// @param _trustedForwarder The trusted forwarder address.
    function setTrustedForwarder(address _trustedForwarder) external;

    /// @notice Getter for the trusted forwarder verifying the meta transaction.
    /// @return The trusted forwarder address.
    function getTrustedForwarder() external view returns (address);

    /// @notice Emitted when a new TrustedForwarder is set on the DAO.
    /// @param forwarder the new forwarder address.
    event TrustedForwarderSet(address forwarder);

    /// @notice Setter for the [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature validator contract.
    /// @param _signatureValidator The address of the signature validator.
    function setSignatureValidator(address _signatureValidator) external;

    /// @notice Emitted when the signature validator address is updated.
    /// @param signatureValidator The address of the signature validator.
    event SignatureValidatorSet(address signatureValidator);

    /// @notice Checks whether a signature is valid for the provided hash by forwarding the call to the set [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature validator contract.
    /// @param _hash The hash of the data to be signed.
    /// @param _signature The signature byte array associated with `_hash`.
    /// @return Returns the `bytes4` magic value `0x1626ba7e` if the signature is valid.
    function isValidSignature(bytes32 _hash, bytes memory _signature) external returns (bytes4);

    /// @notice Registers an ERC standard having a callback by registering its [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID and callback function signature.
    /// @param _interfaceId The ID of the interface.
    /// @param _callbackSelector The selector of the callback function.
    /// @param _magicNumber The magic number to be registered for the function signature.
    function registerStandardCallback(
        bytes4 _interfaceId,
        bytes4 _callbackSelector,
        bytes4 _magicNumber
    ) external;
}
