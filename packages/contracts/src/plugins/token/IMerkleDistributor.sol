// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ERC20WrapperUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";

import {IDAO} from "../../core/dao/IDAO.sol";

interface IMerkleDistributor {
    /// @notice Emitted when tokens are claimed from the distributor.
    /// @param index The index in the balance tree that was claimed.
    /// @param to The address to which the tokens are send.
    /// @param amount The claimed amount.
    event Claimed(uint256 indexed index, address indexed to, uint256 amount);

    /// @notice The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token to be distributed.
    function token() external returns (IERC20Upgradeable);

    /// @notice The merkle root of the balance tree storing the claims.
    function merkleRoot() external returns (bytes32);

    /// @notice Claims tokens from the balance tree and sends it to an address.
    /// @param _index The index in the balance tree to be claimed.
    /// @param _to The receiving address.
    /// @param _amount The amount of tokens.
    /// @param _proof The merkle proof to be verified.
    function claim(
        uint256 _index,
        address _to,
        uint256 _amount,
        bytes32[] calldata _proof
    ) external;

    /// @notice Returns the amount of unclaimed tokens.
    /// @param _index The index in the balance tree to be claimed.
    /// @param _to The receiving address.
    /// @param _amount The amount of tokens.
    /// @param _proof The merkle proof to be verified.
    /// @return The unclaimed amount.
    function unclaimedBalance(
        uint256 _index,
        address _to,
        uint256 _amount,
        bytes32[] memory _proof
    ) external returns (uint256);

    /// @notice Checks if an index on the merkle tree is claimed.
    /// @param _index The index in the balance tree to be claimed.
    /// @return True if the index is claimed.
    function isClaimed(uint256 _index) external view returns (bool);
}
