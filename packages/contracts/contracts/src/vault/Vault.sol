/*
 * SPDX-License-Identifier:    MIT
 */


pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../DAO.sol";
import "../proxy/Component.sol";

contract Vault is UpgradableComponent {
    using SafeERC20 for IERC20;

    address internal constant ETH = address(0);

    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    string private constant ERROR_DEPOSIT_VALUE_ZERO = "VAULT_DEPOSIT_VALUE_ZERO";
    string private constant ERROR_TRANSFER_VALUE_ZERO = "VAULT_TRANSFER_VALUE_ZERO";
    string private constant ERROR_SEND_REVERTED = "VAULT_SEND_REVERTED";
    string private constant ERROR_VALUE_MISMATCH = "VAULT_VALUE_MISMATCH";
    
    event VaultTransfer(address indexed token, address indexed to, uint256 amount, string reason);
    event VaultETHDeposit(address indexed sender, uint256 amount);
    event VaultDeposit(address indexed token, address indexed sender, uint256 amount, string reason);
    
    constructor() initializer {}

    /// @dev Used for UUPS upgradability pattern
    /// @param _dao The DAO contract of the current DAO
    function initialize(DAO _dao) public override initializer {
        Component.initialize(_dao);
    }

    /**  
    * @dev  Inside receive, its own eth deposit event gets used to somehow still allow
        send/transfer from caller contracts. Still, with this solution, access list
        feature is required to make it work. Using the VaultDeposit event, send/transfer
        won't even work with access list as adding 2 more argument adds 1000 more gas.
        NOTE: This mightn't work like this in the future as gas costs are about to change.
        use `send/transfer` from other contracts at your own risk.  
    */
    receive() external payable {
        emit VaultETHDeposit(msg.sender, msg.value);
    }
    
    // TODO: we might need to bring some checks for deposit so that it can't be called without proxy
    // this will make sure that functions don't get called on logic contract and end up there forever.
    /**
    *  @notice allows to deposit ether or token into this vault.
    *  @param _token token address(0x..00 in case of ETH)
    *  @param _value how much to deposit
    *  @param _description reason for the deposit
     */
    function deposit(address _token, uint256 _value, string calldata _description) external payable {
        _deposit(_token, _value, _description);
    }
    
    
    // TODO: 
    // 1. we use the call instead of send/transfer and now problem is reentrancy.
    // do we need to bring import "@openzeppelin/contracts/security/ReentrancyGuard.sol" 
    // solution or since transfer will only be called by the voting contract, the attack
    // wouldn't happen anymore.
    // 2. add permission role to voting as a first implementation.
    /**
    *  @notice allows to transfer ether or token from this vault.
    *  @param _token token address(0x..00 in case of ETH)
    *  @param _to who to transfer to.
    *  @param _value how much to transfer
    *  @param _description reason for the transfer
     */
    function transfer(address _token, address _to, uint256 _value, string calldata _description) external authP(TRANSFER_ROLE) {
        // require(dao.hasRole(APP_TRANSFER_ROLE, msg.sender), "Not Eligible To transfer");
        require(_value > 0, ERROR_TRANSFER_VALUE_ZERO);

        if (_token == ETH) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool ok, ) = _to.call{value: _value}("");
            require(ok, ERROR_SEND_REVERTED);
        } else {
            IERC20(_token).safeTransfer(_to, _value);
        }

        emit VaultTransfer(_token, _to, _value, _description);
    }

    /**
    * @notice get a Vault balance 
    * @param _token on which token to get a balance. (0x.000 in case of ETH)
    * @return balance of the vault on the token address
    */
    function balance(address _token) public view returns (uint256) {
        if (_token == ETH) {
            return address(this).balance;
        } else {
            return IERC20(_token).balanceOf(address(this));
        }
    }

    /// @dev internal function to handle deposit into the Vault.
    function _deposit(address _token, uint256 _value, string calldata _description) internal {
        require(_value > 0, ERROR_DEPOSIT_VALUE_ZERO);

        if (_token == ETH) {
            require(msg.value == _value, ERROR_VALUE_MISMATCH);
        } else {
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _value);
        }

        emit VaultDeposit(_token, msg.sender, _value, _description);
    }
}

