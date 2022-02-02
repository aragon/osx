/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "./Permissions.sol";
import "../erc165/AdaptiveERC165.sol";
import "./../IDAO.sol";

/// @title The base component in the Aragon DAO framework
/// @author Samuel Furter - Aragon Association - 2021
/// @notice The component any component within the Aragon DAO framework has to inherit from the leverage the architecture existing.
abstract contract Component is UUPSUpgradeable, AdaptiveERC165, Permissions {
    /// @notice Role identifier to upgrade a component 
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");

    /// @dev Used for UUPS upgradability pattern
    function initialize(IDAO _dao) public override virtual {
        Permissions.initialize(_dao);
        _registerStandard(type(Component).interfaceId);
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) { }

    /// @dev Fallback to handle future versions of the ERC165 standard.
    fallback () external {
        _handleCallback(msg.sig, msg.data); // WARN: does a low-level return, any code below would be unreacheable
    }
}
