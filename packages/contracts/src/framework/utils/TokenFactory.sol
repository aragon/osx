// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

import {MerkleMinter} from "../../plugins/token/MerkleMinter.sol";
import {MerkleDistributor} from "../../plugins/token/MerkleDistributor.sol";
import {IMerkleDistributor} from "../../plugins/token/IMerkleDistributor.sol";
import {GovernanceERC20} from "../../token/ERC20/governance/GovernanceERC20.sol";
import {GovernanceWrappedERC20} from "../../token/ERC20/governance/GovernanceWrappedERC20.sol";
import {IERC20MintableUpgradeable} from "../../token/ERC20/IERC20MintableUpgradeable.sol";
import {DAO} from "../../core/dao/DAO.sol";
import {IDAO} from "../../core/dao/IDAO.sol";

/// @title TokenFactory
/// @author Aragon Association - 2022-2023
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
    event TokenCreated(
        IERC20Upgradeable token,
        MerkleMinter minter,
        IMerkleDistributor distributor
    );

    /// @notice Emitted when an existing token is passed and wrapped one is created.
    /// @param token GovernanceWrappedERC20 token address
    event WrappedToken(GovernanceWrappedERC20 token);

    /// @notice Thrown if token address is not ERC20.
    /// @param token The token address
    error TokenNotERC20(address token, bytes data);

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

    /// @notice Creates a new `GovernanceERC20` token or a `GovernanceWrappedERC20` from an existing [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token depending on the address used in the `TokenConfig` provided.
    /// @param _managingDao The address of the DAO managing the token.
    /// @param _tokenConfig The token configuration struct containing the name, and symbol of the token to be create, but also an address. For `address(0)`, a new governance token is created. For any other address pointing to an [ERC-20](https://eips.ethereum.org/EIPS/eip-20)-compatible contract, a wrapped governance token is created.
    /// @param _mintSettings The token mint settings struct containing the `receivers` and `amounts`.
    /// @return The created `ERC20VotesUpgradeable` compatible token contract.
    /// @return The created `MerkleMinter` contract used to mint the `ERC20VotesUpgradeable` tokens or `address(0)` if an existing token was provided.
    function createToken(
        DAO _managingDao,
        TokenConfig calldata _tokenConfig,
        GovernanceERC20.MintSettings calldata _mintSettings
    ) external returns (ERC20VotesUpgradeable, MerkleMinter) {
        address token = _tokenConfig.addr;

        // deploy token
        if (token != address(0)) {
            // Validate if token is ERC20
            bytes memory data = token.functionStaticCall(
                abi.encodeWithSelector(IERC20Upgradeable.balanceOf.selector, address(this))
            );

            if (data.length != 0x20) {
                revert TokenNotERC20(token, data);
            }

            token = governanceWrappedERC20Base.clone();
            // user already has a token. we need to wrap it in
            // GovernanceWrappedERC20 in order to make the token
            // include governance functionality.
            GovernanceWrappedERC20(token).initialize(
                IERC20Upgradeable(_tokenConfig.addr),
                _tokenConfig.name,
                _tokenConfig.symbol
            );

            emit WrappedToken(GovernanceWrappedERC20(token));

            return (ERC20VotesUpgradeable(token), MerkleMinter(address(0)));
        }

        token = governanceERC20Base.clone();
        GovernanceERC20(token).initialize(
            _managingDao,
            _tokenConfig.name,
            _tokenConfig.symbol,
            _mintSettings
        );

        // Clone and initialize a `MerkleMinter`
        address merkleMinter = merkleMinterBase.clone();
        MerkleMinter(merkleMinter).initialize(
            _managingDao,
            IERC20MintableUpgradeable(token),
            distributorBase
        );

        // Emit the event
        emit TokenCreated(IERC20Upgradeable(token), MerkleMinter(merkleMinter), distributorBase);

        bytes32 tokenMintPermission = GovernanceERC20(token).MINT_PERMISSION_ID();
        bytes32 merkleMintPermission = MerkleMinter(merkleMinter).MERKLE_MINT_PERMISSION_ID();

        // Grant the managing DAO permission to directly mint tokens to an receiving address.
        _managingDao.grant(token, address(_managingDao), tokenMintPermission);

        // Grant the managing DAO permission to mint tokens via the `MerkleMinter` that are claimable on a merkle tree.
        _managingDao.grant(token, merkleMinter, tokenMintPermission);
        _managingDao.grant(merkleMinter, address(_managingDao), merkleMintPermission);

        return (ERC20VotesUpgradeable(token), MerkleMinter(merkleMinter));
    }

    /// @notice Private helper method to set up the required base contracts on TokenFactory deployment.
    function setupBases() private {
        distributorBase = new MerkleDistributor();
        governanceERC20Base = address(
            new GovernanceERC20(
                IDAO(address(0)),
                "baseName",
                "baseSymbol",
                GovernanceERC20.MintSettings(new address[](0), new uint256[](0))
            )
        );
        governanceWrappedERC20Base = address(
            new GovernanceWrappedERC20(IERC20Upgradeable(address(0)), "baseName", "baseSymbol")
        );
        merkleMinterBase = address(new MerkleMinter());
    }
}
