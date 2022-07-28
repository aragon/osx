// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "../tokens/GovernanceERC20.sol";
import "../tokens/GovernanceWrappedERC20.sol";
import "../core/DAO.sol";
import "../tokens/MerkleMinter.sol";
import "../tokens/MerkleDistributor.sol";

/// @title TokenFactory
/// @author Aragon Association - 2022
/// @notice This contract creates [ERC-20](https://eips.ethereum.org/EIPS/eip-20) governance tokens.
contract TokenFactory {
    using Address for address;
    using Clones for address;

    /// @notice The address of the `GovernanceERC20` base contract to clone from.
    address public governanceERC20Base;

    /// @notice The address of the `GovernanceWrappedERC20` base contract to clone from.
    address public governanceWrappedERC20Base;

    /// @notice The address of the `MerkleMinter` base contract to clone from.
    address public merkleMinterBase;

    /// @notice The `MerkleDistributor` base contract used to initialize the `MerkleMinter` clones.
    MerkleDistributor public distributorBase;

    /// @notice Emitted when a new token is created.
    /// @param token [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token address.
    /// @param minter The `MerkleMinter` contract minting the new token.
    /// @param distributor The `MerkleDistibutor` contract distributing the new token.
    event TokenCreated(IERC20Upgradeable token, MerkleMinter minter, MerkleDistributor distributor);

    struct TokenConfig {
        address addr;
        string name;
        string symbol;
    }

    struct MintConfig {
        address[] receivers;
        uint256[] amounts;
    }

    /// @notice Initializes the different base contracts for the factory to clone from.
    constructor() {
        setupBases();
    }

    /// TODO: Worth considering the decimals ?
    /// @notice Creates a new `GovernanceERC20` token or a `GovernanceWrappedERC20` from an existing [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token depending on the address used in the `TokenConfig` provided.
    /// @param _managingDao The address of the DAO managing the token.
    /// @param _tokenConfig The token configuration struct containing the name, and symbol of the token to be create, but also an address. For `address(0)`, a new governance token is created. For any other address pointing to an [ERC-20](https://eips.ethereum.org/EIPS/eip-20)-compatible contract, a wrapped governance token is created.
    /// @param _mintConfig The token mint configuration struct containing the `receivers` and `amounts`.
    /// @return ERC20VotesUpgradeable The address of the created token.
    /// @return MerkleMinter The `MerkleMinter` contract address being used to mint token address(zero address in case passed token addr was not zero)
    function createToken(
        DAO _managingDao,
        TokenConfig calldata _tokenConfig,
        MintConfig calldata _mintConfig
    ) external returns (ERC20VotesUpgradeable, MerkleMinter) {
        address token = _tokenConfig.addr;

        // deploy token
        if (token != address(0)) {
            // Validate if token is ERC20
            // Not Enough Checks, but better than nothing.
            token.functionCall(
                abi.encodeWithSelector(IERC20Upgradeable.balanceOf.selector, address(this))
            );

            token = governanceWrappedERC20Base.clone();
            // user already has a token. we need to wrap it in
            // GovernanceWrappedERC20 in order to make the token
            // include governance functionality.
            GovernanceWrappedERC20(token).initialize(
                IERC20Upgradeable(_tokenConfig.addr),
                _tokenConfig.name,
                _tokenConfig.symbol
            );

            return (ERC20VotesUpgradeable(token), MerkleMinter(address(0)));
        }

        token = governanceERC20Base.clone();
        GovernanceERC20(token).initialize(_managingDao, _tokenConfig.name, _tokenConfig.symbol);

        // Clone and initialize a `MerkleMinter`
        address merkleMinter = merkleMinterBase.clone();
        MerkleMinter(merkleMinter).initialize(
            _managingDao,
            _managingDao.getTrustedForwarder(),
            IERC20MintableUpgradeable(token),
            distributorBase
        );

        // Emit the event
        emit TokenCreated(
            IERC20Upgradeable(token),
            MerkleMinter(merkleMinter),
            MerkleDistributor(distributorBase)
        );

        bytes32 tokenMintPermission = GovernanceERC20(token).MINT_PERMISSION_ID();
        bytes32 merkleMintPermission = MerkleMinter(merkleMinter).MERKLE_MINT_PERMISSION_ID();

        // Grant the permission to mint to the token factory (`address(this)`).
        _managingDao.grant(token, address(this), tokenMintPermission);

        for (uint256 i = 0; i < _mintConfig.receivers.length; i++) {
            // allow minting to treasury
            address receiver = _mintConfig.receivers[i] == address(0)
                ? address(_managingDao)
                : _mintConfig.receivers[i];
            IERC20MintableUpgradeable(token).mint(receiver, _mintConfig.amounts[i]);
        }

        // Revoke the mint permission from the token factory (`address(this)`).
        _managingDao.revoke(token, address(this), tokenMintPermission);

        // Grant the managing DAO permission to directly mint tokens to an receiving address.
        _managingDao.grant(token, address(_managingDao), tokenMintPermission);

        // Grant the managing DAO permission to mint tokens via the `MerkleMinter` that are claimable on a merkle tree.
        _managingDao.grant(token, merkleMinter, tokenMintPermission);
        _managingDao.grant(merkleMinter, address(_managingDao), merkleMintPermission);

        return (ERC20VotesUpgradeable(token), MerkleMinter(merkleMinter));
    }

    /// @notice Private helper method to set up the required base contracts on TokenFactory deployment.
    // TODO: Why is this outside the constructor?
    function setupBases() private {
        distributorBase = new MerkleDistributor();
        governanceERC20Base = address(new GovernanceERC20());
        governanceWrappedERC20Base = address(new GovernanceWrappedERC20());
        merkleMinterBase = address(new MerkleMinter());
    }
}
