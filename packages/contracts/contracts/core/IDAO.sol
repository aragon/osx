// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../plugin/PluginRepo.sol";

/// @title The interface required to have a DAO contract within the Aragon DAO framework
/// @author Aragon Association - 2022
abstract contract IDAO {
    bytes4 internal constant DAO_INTERFACE_ID = type(IDAO).interfaceId;

    struct Action {
        address to; // Address to call
        uint256 value; // Value to be sent with the call (for example ETH if on mainnet)
        bytes data; // FuncSig + arguments
    }

    struct DAOPlugin {
        bytes32 node;
        uint16[3] semanticVersion;
        uint256 count; // number of same plugin installed
    }

    /// @notice Checks if an address has permission on a contract via a role identifier and considers if `ANY_ADDRESS` was used in the granting process.
    /// @param _where The address of the contract
    /// @param _who The address of a EOA or contract to give the permissions
    /// @param _role The hash of the role identifier
    /// @param _data The optional data passed to the ACLOracle registered
    /// @return bool Returns whether the address has permission is or not
    function hasPermission(
        address _where,
        address _who,
        bytes32 _role,
        bytes memory _data
    ) external virtual returns (bool);

    /// @notice Updates the DAO metadata
    /// @dev Sets a new IPFS hash
    /// @param _metadata The IPFS hash of the new metadata object
    function setMetadata(bytes calldata _metadata) external virtual;

    /// @notice Emitted when the DAO metadata is updated
    /// @param metadata The IPFS hash of the new metadata object
    event MetadataSet(bytes metadata);

    function setPlugin(DAOPlugin memory _daoPlugin, address _proxyAddress) external virtual;

    event PluginSet(address proxyAddress, DAOPlugin daoPlugin);

    /// @notice Executes a list of actions
    /// @dev It runs a loop through the array of actions and executes them one by one.
    /// @dev If one action fails, all will be reverted.
    /// @param callId The id of the call
    /// @dev The value of callId is defined by the component/contract calling execute. It can be used, for example, as a nonce.
    /// @param _actions The array of actions
    /// @return bytes[] The array of results obtained from the executed actions in `bytes`
    function execute(uint256 callId, Action[] memory _actions)
        external
        virtual
        returns (bytes[] memory);

    /// @notice Emitted when a proposal is executed
    /// @param actor The address of the caller
    /// @param callId The id of the call
    /// @dev The value of callId is defined by the component/contract calling the execute function.
    ///      A Component implementation can use it, for example, as a nonce.
    /// @param actions Array of actions executed
    /// @param execResults Array with the results of the executed actions
    event Executed(address indexed actor, uint256 callId, Action[] actions, bytes[] execResults);

    /// @notice Deposit ETH or any token to this contract with a reference string
    /// @dev Deposit ETH (token address == 0) or any token with a reference
    /// @param _token The address of the token and in case of ETH address(0)
    /// @param _amount The amount of tokens to deposit
    /// @param _reference The reference describing the deposit reason
    function deposit(
        address _token,
        uint256 _amount,
        string calldata _reference
    ) external payable virtual;

    /// @notice Emitted when a deposit has been made to the DAO
    /// @param sender The address of the sender
    /// @param token The address of the token deposited
    /// @param amount The amount of tokens deposited
    /// @param _reference The reference describing the deposit reason
    event Deposited(
        address indexed sender,
        address indexed token,
        uint256 amount,
        string _reference
    );

    /// @notice Emitted when ETH is deposited
    /// @dev `ETHDeposited` and `Deposited` are both needed. `ETHDeposited` makes sure that whoever sends funds
    ///      with `send`/`transfer`, receive function can still be executed without reverting due to gas cost
    ///      increases in EIP-2929. To still use `send`/`transfer`, access list is needed that has the address
    ///      of the contract(base contract) that is behind the proxy.
    /// @param sender The address of the sender
    /// @param amount The amount of ETH deposited
    event ETHDeposited(address sender, uint256 amount);

    /// @notice Withdraw tokens or ETH from the DAO with a withdraw reference string
    /// @param _token The address of the token and in case of ETH address(0)
    /// @param _to The target address to send tokens or ETH
    /// @param _amount The amount of tokens to withdraw
    /// @param _reference The reference describing the withdrawal reason
    function withdraw(
        address _token,
        address _to,
        uint256 _amount,
        string memory _reference
    ) external virtual;

    /// @notice Emitted when a withdrawal has been made from the DAO
    /// @param token The address of the token withdrawn
    /// @param to The address of the withdrawer
    /// @param amount The amount of tokens withdrawn
    /// @param _reference The reference describing the withdrawal reason
    event Withdrawn(address indexed token, address indexed to, uint256 amount, string _reference);

    /// @notice Setter for the trusted forwarder verifying the meta transaction
    /// @param _trustedForwarder The trusted forwarder address
    /// @dev Used to update the trusted forwarder
    function setTrustedForwarder(address _trustedForwarder) external virtual;

    /// @notice Setter for the trusted forwarder verifying the meta transaction
    /// @return The trusted forwarder address
    function trustedForwarder() external virtual returns (address);

    /// @notice Emitted when a new TrustedForwarder is set on the DAO
    /// @param forwarder the new forwarder address
    event TrustedForwarderSet(address forwarder);

    /// @notice Setter for the ERC1271 signature validator contract
    /// @param _signatureValidator ERC1271 SignatureValidator
    function setSignatureValidator(address _signatureValidator) external virtual;

    /// @notice Validates the signature as described in ERC1271
    /// @param _hash Hash of the data to be signed
    /// @param _signature Signature byte array associated with _hash
    /// @return bytes4
    function isValidSignature(bytes32 _hash, bytes memory _signature)
        external
        virtual
        returns (bytes4);
}
