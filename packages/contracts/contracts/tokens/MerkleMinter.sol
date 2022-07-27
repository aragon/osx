// SPDX-License-Identifier: MIT

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

    /// @notice Initializes the component
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _dao The IDAO interface of the associated DAO
    /// @param _trustedForwarder The address of the trusted GSN forwarder required for meta transactions
    /// @param _token A mintable ERC20 token
    /// @param _distributorBase A `MerkleDistributor` to be cloned
    function __MerkleMinter_init(
        IDAO _dao,
        address _trustedForwarder,
        IERC20MintableUpgradeable _token,
        MerkleDistributor _distributorBase
    ) public onlyInitializing {
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

    /// @notice Mints ERC20 token and distributes them using a `MerkleDistributor`
    /// @param _merkleRoot the root of the merkle balance tree
    /// @param _totalAmount the total amount of tokens to be minted
    /// @param _tree the link to the stored merkle tree
    /// @param _context additional info related to the minting process
    function merkleMint(
        bytes32 _merkleRoot,
        uint256 _totalAmount,
        bytes calldata _tree,
        bytes calldata _context
    ) external auth(MERKLE_MINTER_ROLE) returns (MerkleDistributor distributor) {
        address distributorAddr = distributorBase.clone();
        MerkleDistributor(distributorAddr).initialize(
            dao,
            dao.trustedForwarder(),
            token,
            _merkleRoot
        );

        token.mint(distributorAddr, _totalAmount);

        emit MintedMerkle(distributorAddr, _merkleRoot, _totalAmount, _tree, _context);

        return MerkleDistributor(distributorAddr);
    }
}
