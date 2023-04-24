// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import {IERC20MintableUpgradeable} from "../../token/ERC20/IERC20MintableUpgradeable.sol";
import {IDAO} from "../../core/dao/IDAO.sol";
import {IMerkleDistributor} from "./IMerkleDistributor.sol";

interface IMerkleMinter {
    /// @notice Emitted when a token is minted.
    /// @param distributor The `MerkleDistributor` address via which the tokens can be claimed.
    /// @param merkleRoot The root of the merkle balance tree.
    /// @param totalAmount The total amount of tokens that were minted.
    /// @param tree The link to the stored merkle tree.
    /// @param context Additional info related to the minting process.
    event MerkleMinted(
        address indexed distributor,
        bytes32 indexed merkleRoot,
        uint256 totalAmount,
        bytes tree,
        bytes context
    );

    /// @notice The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token to be distributed.
    function token() external returns (IERC20MintableUpgradeable);

    /// @notice The address of the `MerkleDistributor` to clone from.
    function distributorBase() external returns (IMerkleDistributor);

    /// @notice changes the base distributor address
    /// @param _distributorBase the address of base distributor
    function changeDistributorBase(IMerkleDistributor _distributorBase) external;

    /// @notice Mints [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens and distributes them using a `MerkleDistributor`.
    /// @param _merkleRoot The root of the merkle balance tree.
    /// @param _totalAmount The total amount of tokens to be minted.
    /// @param _tree The link to the stored merkle tree.
    /// @param _context Additional info related to the minting process.
    /// @return distributor The `MerkleDistributor` via which the tokens can be claimed.
    function merkleMint(
        bytes32 _merkleRoot,
        uint256 _totalAmount,
        bytes calldata _tree,
        bytes calldata _context
    ) external returns (IMerkleDistributor distributor);
}
