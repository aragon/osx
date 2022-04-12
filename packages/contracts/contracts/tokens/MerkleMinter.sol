/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../core/IDAO.sol";
import "../core/component/Permissions.sol";
import "../core/component/MetaTxComponent.sol";

import "./MerkleDistributor.sol";

contract MerkleMinter is MetaTxComponent {
    using Clones for address;

    bytes32 constant public MERKLE_MINTER_ROLE = keccak256("MERKLE_MINTER_ROLE");

    GovernanceERC20 public token;
    address public distributorBase;

    event MintedMerkle(address indexed distributor, bytes32 indexed merkleRoot, uint256 totalAmount, bytes tree, bytes context);

    constructor(IDAO _dao, GovernanceERC20 _token, MerkleDistributor _distributorBase, address _gsnForwarder) {
        initialize(_dao, _token, _distributorBase, _gsnForwarder);
    }
    
    /// @notice Initializes Merkle Minter
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _dao The IDAO interface of the associated DAO
    /// @param _token The token where the distribution goes to.
    /// @param _distributorBase The distributor base.
    function initialize(
        IDAO _dao,
        GovernanceERC20 _token, 
        MerkleDistributor _distributorBase,
        address _gsnForwarder
    ) public initializer {
        token = _token;
        distributorBase = address(_distributorBase);

        __MetaTxComponent_init(_dao, _gsnForwarder);
    }

    /// @notice Returns the version of the GSN relay recipient
    /// @dev Describes the version and contract for GSN compatibility
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.MerleMinter";
    }

    function merkleMint(
        bytes32 _merkleRoot, 
        uint256 _totalAmount, 
        bytes calldata _tree, 
        bytes calldata _context
    ) 
    external auth(MERKLE_MINTER_ROLE) 
    returns (MerkleDistributor distributor) 
    {
        address distributorAddr = distributorBase.clone();
        MerkleDistributor(distributorAddr).initialize(dao, token, _merkleRoot, trustedForwarder());

        token.mint(distributorAddr, _totalAmount);

        emit MintedMerkle(distributorAddr, _merkleRoot, _totalAmount, _tree, _context);

        return MerkleDistributor(distributorAddr);
    }
}
