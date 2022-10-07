// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import "../erc165/AdaptiveERC165.sol";
import "../IDAO.sol";
import { DaoAuthorizableUpgradeable } from "./DaoAuthorizableUpgradeable.sol";

/// @title Component
/// @author Aragon Association - 2021, 2022
/// @notice The base component in the Aragon App DAO framework.
abstract contract Component is UUPSUpgradeable, AdaptiveERC165, DaoAuthorizableUpgradeable {
    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    /// @notice Initializes the DAO by storing the associated DAO and registering the contract's [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The associated DAO address.
    function __Component_init(IDAO _dao) internal virtual onlyInitializing {
        __DaoAuthorizable_init(_dao);

        _registerStandard(type(Component).interfaceId);
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_PERMISSION_ID` permission.
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_PERMISSION_ID) {}

    /// @dev Fallback to handle future versions of the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) standard.
    fallback() external {
        _handleCallback(msg.sig, _msgData()); // WARN: does a low-level return, any code below would be unreacheable
    }
}
