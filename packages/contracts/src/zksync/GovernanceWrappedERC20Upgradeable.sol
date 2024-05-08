// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {GovernanceWrappedERC20} from "../token/ERC20/governance/GovernanceWrappedERC20.sol";
import {DaoAuthorizableUpgradeable} from "../core/plugin/dao-authorizable/DaoAuthorizableUpgradeable.sol";

/// @title GovernanceERC20
/// @author Aragon Association
/// @notice An [OpenZeppelin `Votes`](https://docs.openzeppelin.com/contracts/4.x/api/governance#Votes) compatible [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token that can be used for voting and is managed by a DAO.
contract GovernanceWrappedERC20Upgradeable is
    DaoAuthorizableUpgradeable,
    GovernanceWrappedERC20,
    UUPSUpgradeable
{
    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_GOVERNANCE_ERC20_PERMISSION_ID =
        keccak256("UPGRADE_GOVERNANCE_ERC20_PERMISSION");

    /// @notice Calls the initialize function.
    /// @param _token The underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol of the wrapped token.
    constructor(
        IERC20Upgradeable _token,
        string memory _name,
        string memory _symbol
    ) GovernanceWrappedERC20(_token, _name, _symbol) {}

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_DAO_PERMISSION_ID` permission.
    function _authorizeUpgrade(
        address
    ) internal virtual override auth(UPGRADE_GOVERNANCE_ERC20_PERMISSION_ID) {}
}
