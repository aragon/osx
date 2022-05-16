/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";

import "../core/IDAO.sol";
import "../core/component/MetaTxComponent.sol";
import "./IERC20MintableUpgradeable.sol";
import "./MerkleDistributor.sol";

contract MerkleMinter is MetaTxComponent {
    using Clones for address;

    bytes4 internal constant MERKLE_MINTER_INTERFACE_ID = this.merkleMint.selector;

    bytes32 public constant MERKLE_MINTER_ROLE = keccak256("MERKLE_MINTER_ROLE");

    IERC20MintableUpgradeable public token;
    address public distributorBase;

    event MintedMerkle(
        address indexed distributor,
        bytes32 indexed merkleRoot,
        uint256 totalAmount,
        bytes tree,
        bytes context
    );

    function initialize(
        IDAO _dao,
        address _trustedForwarder,
        IERC20MintableUpgradeable _token,
        MerkleDistributor _distributorBase
    ) external initializer {
        _registerStandard(MERKLE_MINTER_INTERFACE_ID);
        __MetaTxComponent_init(_dao, _trustedForwarder);

        token = _token;
        distributorBase = address(_distributorBase);
    }

    /// @notice Returns the version of the GSN relay recipient
    /// @dev Describes the version and contract for GSN compatibility
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.MerkleMinter";
    }

    function merkleMint(
        bytes32 _merkleRoot,
        uint256 _totalAmount,
        bytes calldata _tree,
        bytes calldata _context
    ) external auth(MERKLE_MINTER_ROLE) returns (MerkleDistributor distributor) {
        address distributorAddr = distributorBase.clone();
        MerkleDistributor(distributorAddr).initialize(dao, dao.trustedForwarder(), token, _merkleRoot);

        token.mint(distributorAddr, _totalAmount);

        emit MintedMerkle(distributorAddr, _merkleRoot, _totalAmount, _tree, _context);

        return MerkleDistributor(distributorAddr);
    }
}
