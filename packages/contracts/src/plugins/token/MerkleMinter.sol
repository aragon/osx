// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import {IDAO} from "../../core/dao/IDAO.sol";
import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";
import {IERC20MintableUpgradeable} from "../../token/ERC20/IERC20MintableUpgradeable.sol";
import {createERC1967Proxy} from "../../utils/Proxy.sol";
import {IMerkleDistributor} from "./IMerkleDistributor.sol";
import {MerkleDistributor} from "./MerkleDistributor.sol";
import {IMerkleMinter} from "./IMerkleMinter.sol";

/// @title MerkleMinter
/// @author Aragon Association
/// @notice A component minting [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens and distributing them on merkle trees using `MerkleDistributor` clones.
contract MerkleMinter is IMerkleMinter, PluginUUPSUpgradeable {
    using Clones for address;

    /// @notice The ID of the permission required to call the `merkleMint` function.
    bytes32 public constant MERKLE_MINT_PERMISSION_ID = keccak256("MERKLE_MINT_PERMISSION");

    /// @notice The ID of the permission required to call the `changeDistributor` function.
    bytes32 public constant CHANGE_DISTRIBUTOR_PERMISSION_ID =
        keccak256("CHANGE_DISTRIBUTOR_PERMISSION");

    /// @inheritdoc IMerkleMinter
    IERC20MintableUpgradeable public override token;

    /// @inheritdoc IMerkleMinter
    IMerkleDistributor public override distributorBase;

    /// @dev Used to disallow initializing the implementation contract by an attacker for extra safety.
    constructor() {
        _disableInitializers();
    }

    /// @inheritdoc IMerkleMinter
    function initialize(
        IDAO _dao,
        IERC20MintableUpgradeable _token,
        IMerkleDistributor _distributorBase
    ) external override initializer {
        __PluginUUPSUpgradeable_init(_dao);

        token = _token;
        distributorBase = _distributorBase;
    }

    /// @inheritdoc IMerkleMinter
    function changeDistributorBase(
        IMerkleDistributor _distributorBase
    ) external override auth(CHANGE_DISTRIBUTOR_PERMISSION_ID) {
        distributorBase = _distributorBase;
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param interfaceId The ID of the interface.
    /// @return bool Returns `true` if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IMerkleMinter).interfaceId || super.supportsInterface(interfaceId);
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
    ) external override auth(MERKLE_MINT_PERMISSION_ID) returns (IMerkleDistributor distributor) {
        address distributorAddr = createERC1967Proxy(
            address(distributorBase),
            abi.encodeWithSelector(
                distributorBase.initialize.selector,
                dao(),
                IERC20Upgradeable(address(token)),
                _merkleRoot
            )
        );

        token.mint(distributorAddr, _totalAmount);

        emit MerkleMinted(distributorAddr, _merkleRoot, _totalAmount, _tree, _context);

        return IMerkleDistributor(distributorAddr);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[48] private __gap;
}
