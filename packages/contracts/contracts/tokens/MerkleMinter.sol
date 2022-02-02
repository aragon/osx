/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../core/IDAO.sol";
import "../core/component/Permissions.sol";
import "./MerkleDistributor.sol";

contract MerkleMinter is Permissions {
    using Clones for address;

    bytes32 constant public MERKLE_MINTER_ROLE = keccak256("MERKLE_MINTER_ROLE");

    GovernanceERC20 public token;
    address public distributorBase;

    event MintedMerkle(address indexed distributor, bytes32 indexed merkleRoot, uint256 totalAmount, bytes tree, bytes context);

    function initialize(
        IDAO _dao,
        GovernanceERC20 _token, 
        MerkleDistributor _distributorBase
    ) external initializer {
        token = _token;
        distributorBase = address(_distributorBase);
        Permissions.initialize(_dao);
    }

    function merkleMint(
        bytes32 _merkleRoot, 
        uint256 _totalAmount, 
        bytes calldata _tree, 
        bytes calldata _context
    ) external auth(MERKLE_MINTER_ROLE) 
    returns (MerkleDistributor distributor) 
    {
        address distributorAddr = distributorBase.clone();
        MerkleDistributor(distributorAddr).initialize(token, _merkleRoot);

        token.mint(distributorAddr, _totalAmount);

        emit MintedMerkle(distributorAddr, _merkleRoot, _totalAmount, _tree, _context);

        return MerkleDistributor(distributorAddr);
    }
}
