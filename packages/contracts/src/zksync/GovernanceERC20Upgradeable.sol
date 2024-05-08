// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {GovernanceERC20} from "../token/ERC20/governance/GovernanceERC20.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {IDAO} from "../core/dao/IDAO.sol";

/// @title GovernanceERC20
/// @author Aragon Association
/// @notice An [OpenZeppelin `Votes`](https://docs.openzeppelin.com/contracts/4.x/api/governance#Votes) compatible [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token that can be used for voting and is managed by a DAO.
contract GovernanceERC20Upgradeable is GovernanceERC20, UUPSUpgradeable {
    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_GOVERNANCE_ERC20_PERMISSION_ID =
        keccak256("UPGRADE_GOVERNANCE_ERC20_PERMISSION");

    /// @notice Calls the initialize function.
    /// @param _dao The managing DAO.
    /// @param _name The name of the [ERC-20](https://eips.ethereum.org/EIPS/eip-20) governance token.
    /// @param _symbol The symbol of the [ERC-20](https://eips.ethereum.org/EIPS/eip-20) governance token.
    /// @param _mintSettings The token mint settings struct containing the `receivers` and `amounts`.
    constructor(
        IDAO _dao,
        string memory _name,
        string memory _symbol,
        MintSettings memory _mintSettings
    ) GovernanceERC20(_dao, _name, _symbol, _mintSettings) {}

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_DAO_PERMISSION_ID` permission.
    function _authorizeUpgrade(
        address
    ) internal virtual override auth(UPGRADE_GOVERNANCE_ERC20_PERMISSION_ID) {}
}
