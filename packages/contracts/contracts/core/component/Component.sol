// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import "../erc165/AdaptiveERC165.sol";
import "../IDAO.sol";
import "./DAOPermissioned.sol";

/// @title The base component in the Aragon DAO framework
/// @author Aragon Association - 2021, 2022
/// @notice Any component within the Aragon DAO framework has to inherit from this contract
abstract contract Component is UUPSUpgradeable, AdaptiveERC165, DAOPermissioned {
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION_ID");

    /// @notice Initialization
    /// @param _dao The associated DAO address
    function __Component_init(IDAO _dao) internal virtual onlyInitializing {
        __DAOPermissioned_init(_dao);

        _registerStandard(type(Component).interfaceId);
    }

    /// @notice Internal method authorizing the upgrade of the contract via the `UUPSUpgradeable` pattern
    /// @dev The caller must have the `UPGRADE_PERMISSION_ID` permission
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_PERMISSION_ID) {}

    /// @dev Fallback to handle future versions of the ERC165 standard.
    fallback() external {
        _handleCallback(msg.sig, _msgData()); // WARN: does a low-level return, any code below would be unreacheable
    }
}
