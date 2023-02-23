// SPDX-License-Identifier: GPL-3.0

// Copied and modified from: https://github.com/Uniswap/merkle-distributor/blob/master/contracts/MerkleDistributor.sol

pragma solidity 0.8.17;

import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import {IDAO} from "../../core/dao/IDAO.sol";
import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";
import {IMerkleDistributor} from "./IMerkleDistributor.sol";

/// @title MerkleDistributor
/// @author Uniswap 2020, Modified by Aragon Association 2021-2023
/// @notice A component distributing claimable [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens via a merkle tree.
contract MerkleDistributor is IMerkleDistributor, PluginUUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @inheritdoc IMerkleDistributor
    IERC20Upgradeable public override token;

    /// @inheritdoc IMerkleDistributor
    bytes32 public override merkleRoot;

    /// @notice A packed array of booleans containing the information who claimed.
    mapping(uint256 => uint256) private claimedBitMap;

    /// @notice Thrown if tokens have been already claimed from the distributor.
    /// @param index The index in the balance tree that was claimed.
    error TokenAlreadyClaimed(uint256 index);

    /// @notice Thrown if a claim is invalid.
    /// @param index The index in the balance tree to be claimed.
    /// @param to The address to which the tokens should be sent.
    /// @param amount The amount to be claimed.
    error TokenClaimInvalid(uint256 index, address to, uint256 amount);

    /// @notice Initializes the plugin.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _token A mintable [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token.
    /// @param _merkleRoot The merkle root of the balance tree.
    function initialize(
        IDAO _dao,
        IERC20Upgradeable _token,
        bytes32 _merkleRoot
    ) external initializer {
        __PluginUUPSUpgradeable_init(_dao);
        token = _token;
        merkleRoot = _merkleRoot;
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == type(IMerkleDistributor).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /// @inheritdoc IMerkleDistributor
    function claim(
        uint256 _index,
        address _to,
        uint256 _amount,
        bytes32[] calldata _proof
    ) external override {
        if (isClaimed(_index)) revert TokenAlreadyClaimed({index: _index});
        if (!_verifyBalanceOnTree(_index, _to, _amount, _proof))
            revert TokenClaimInvalid({index: _index, to: _to, amount: _amount});

        _setClaimed(_index);
        token.safeTransfer(_to, _amount);

        emit Claimed(_index, _to, _amount);
    }

    /// @inheritdoc IMerkleDistributor
    function unclaimedBalance(
        uint256 _index,
        address _to,
        uint256 _amount,
        bytes32[] memory _proof
    ) public view override returns (uint256) {
        if (isClaimed(_index)) return 0;
        return _verifyBalanceOnTree(_index, _to, _amount, _proof) ? _amount : 0;
    }

    /// @notice Verifies a balance on a merkle tree.
    /// @param _index The index in the balance tree to be claimed.
    /// @param _to The receiving address.
    /// @param _amount The amount of tokens.
    /// @param _proof The merkle proof to be verified.
    /// @return True if the given proof is correct.
    function _verifyBalanceOnTree(
        uint256 _index,
        address _to,
        uint256 _amount,
        bytes32[] memory _proof
    ) internal view returns (bool) {
        bytes32 node = keccak256(abi.encodePacked(_index, _to, _amount));
        return MerkleProof.verify(_proof, merkleRoot, node);
    }

    /// @inheritdoc IMerkleDistributor
    function isClaimed(uint256 _index) public view override returns (bool) {
        uint256 claimedWord_index = _index / 256;
        uint256 claimedBit_index = _index % 256;
        uint256 claimedWord = claimedBitMap[claimedWord_index];
        uint256 mask = (1 << claimedBit_index);
        return claimedWord & mask == mask;
    }

    /// @notice Sets an index in the merkle tree to be claimed.
    /// @param _index The index in the balance tree to be claimed.
    function _setClaimed(uint256 _index) private {
        uint256 claimedWord_index = _index / 256;
        uint256 claimedBit_index = _index % 256;
        claimedBitMap[claimedWord_index] =
            claimedBitMap[claimedWord_index] |
            (1 << claimedBit_index);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[47] private __gap;
}
