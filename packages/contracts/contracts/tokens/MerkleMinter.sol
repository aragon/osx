// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";

import "../core/IDAO.sol";
import "../core/component/MetaTxComponent.sol";
import "./IERC20MintableUpgradeable.sol";
import "./MerkleDistributor.sol";

/// @title MerkleMinter
/// @author Aragon Association
/// @notice A component minting [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens and distributing them on merkle trees using `MerkleDistributor` clones.
contract MerkleMinter is MetaTxComponent {
    using Clones for address;

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant MERKLE_MINTER_INTERFACE_ID = this.merkleMint.selector;

    /// @notice The ID of the permission required to call the `merkleMint` function.
    bytes32 public constant MERKLE_MINT_PERMISSION_ID = keccak256("MERKLE_MINT_PERMISSION");

    /// @notice The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token to be distributed.
    IERC20MintableUpgradeable public token;

    /// @notice The address of the `MerkleDistributor` to clone from.
    address public distributorBase;

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

    /// @notice Initializes the component.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _trustedForwarder The address of the trusted forwarder required for meta transactions.
    /// @param _token A mintable [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token.
    /// @param _distributorBase A `MerkleDistributor` to be cloned.
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

    /// @notice Returns the version of the GSN relay recipient.
    /// @dev Describes the version and contract for GSN compatibility.
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.MerkleMinter";
    }

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
    ) external auth(MERKLE_MINT_PERMISSION_ID) returns (MerkleDistributor distributor) {
        address distributorAddr = distributorBase.clone();
        MerkleDistributor(distributorAddr).initialize(
            dao,
            dao.getTrustedForwarder(),
            token,
            _merkleRoot
        );

        token.mint(distributorAddr, _totalAmount);

        emit MerkleMinted(distributorAddr, _merkleRoot, _totalAmount, _tree, _context);

        return MerkleDistributor(distributorAddr);
    }
}
