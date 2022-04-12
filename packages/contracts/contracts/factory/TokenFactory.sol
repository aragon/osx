/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "../tokens/GovernanceERC20.sol";
import "../tokens/GovernanceWrappedERC20.sol";
import "../tokens/MerkleDistributor.sol";
import "../tokens/MerkleMinter.sol";

import "../core/DAO.sol";
import "../tokens/MerkleDistributor.sol";

/// @title TokenFactory to create a DAO
/// @author Giorgi Lagidze - Aragon Association - 2022
/// @notice This contract is used to create a Token.
contract TokenFactory {
    using Address for address;
    using Clones for address;

    address public governanceERC20Base;
    address public governanceWrappedERC20Base;
    address public merkleMinterBase;

    MerkleDistributor public distributorBase;

    event TokenCreated(IERC20Upgradeable token, MerkleMinter minter, MerkleDistributor distributor);

    struct TokenConfig {
        address addr;
        string name;
        string symbol;
        bool useProxies;
    }

    struct MintConfig {
        address[] receivers;
        uint256[] amounts;
    }

    constructor() {
        setupBases();
    }

    /// TODO: Worth considering the decimals ? 
    /// @notice if addr is zero, creates new token + merkle minter, otherwise, creates a wrapped token only.
    /// @param _dao The dao address
    /// @param _tokenConfig The address of the token, name, and symbol. If no addr is passed will a new token get created.
    /// @param _mintConfig contains addresses and values(where to mint tokens and how much)
    /// @return ERC20VotesUpgradeable new token address
    /// @return MerkleMinter new merkle minter address(zero address in case passed token addr was not zero)
    function newToken(
        DAO _dao,
        TokenConfig calldata _tokenConfig,
        MintConfig calldata _mintConfig,
        address _gsnForwarder
    ) external returns (ERC20VotesUpgradeable, MerkleMinter) {
        // token already exists - wrap it inside our governance
        if(_tokenConfig.addr != address(0)) {
            address token = _deployWrappedGovernanceToken(
                _tokenConfig.addr, 
                _tokenConfig.name, 
                _tokenConfig.symbol, 
                _tokenConfig.useProxies
            );
            return (ERC20VotesUpgradeable(token), MerkleMinter(address(0)));
        }

        // token doesn't exist, deploy governance token and merkle minter
        (address token, address minter) = _deployGovernanceToken(
            _dao, 
            _tokenConfig.name, 
            _tokenConfig.symbol, 
            _tokenConfig.useProxies,
            _gsnForwarder
        );
        
        // emit event for new token
        emit TokenCreated(
            IERC20Upgradeable(token),
            MerkleMinter(minter),
            MerkleDistributor(distributorBase)
        );

        bytes32 tokenMinterRole  = GovernanceERC20(token).TOKEN_MINTER_ROLE();
        bytes32 merkleMinterRole = MerkleMinter(minter).MERKLE_MINTER_ROLE();

        // give tokenFactory the permission to mint.
        _dao.grant(token, address(this), tokenMinterRole);

        for(uint i = 0; i < _mintConfig.receivers.length; i++) {
            GovernanceERC20(token).mint(
                _mintConfig.receivers[i], 
                _mintConfig.amounts[i]
            );
        }
        // remove the mint permission from tokenFactory
        _dao.revoke(token, address(this), tokenMinterRole);

        _dao.grant(token, address(_dao), tokenMinterRole);
        _dao.grant(token, minter, tokenMinterRole);
        _dao.grant(minter, address(_dao), merkleMinterRole);
        
        return (
            ERC20VotesUpgradeable(token), 
            MerkleMinter(minter)
        );
    }

    function _deployGovernanceToken(
        DAO _dao,
        string calldata _name,
        string calldata _symbol,
        bool _useProxies,
        address _gsnForwarder
    ) private returns(
        address token, 
        address minter
    ) {
        if(_useProxies) {
            token = governanceERC20Base.clone();
            GovernanceERC20(token).initialize(_dao, _name, _symbol);

            // deploy and initialize minter
            minter = merkleMinterBase.clone();
            MerkleMinter(minter).initialize(
                _dao,
                GovernanceERC20(token),
                distributorBase,
                _gsnForwarder
            );
        } else {
            token = address(new GovernanceERC20(_dao, _name, _symbol));
            minter = address(new MerkleMinter(_dao, GovernanceERC20(token), distributorBase, _gsnForwarder));
        }
    }

    function _deployWrappedGovernanceToken(
        address _token,
        string calldata _name,
        string calldata _symbol,
        bool _useProxies
    ) private returns(address token) {
        // Validate if token is ERC20
        // Not Enough Checks, but better than nothing.
        _token.functionCall(abi.encodeWithSelector(
            IERC20Upgradeable.balanceOf.selector, 
            address(this)
        )); 

        if(_useProxies) {
            token = governanceWrappedERC20Base.clone();
            // user already has a token. we need to wrap it in 
            // GovernanceWrappedERC20 in order to make the token
            // include governance functionality.
            GovernanceWrappedERC20(token).initialize(
                IERC20Upgradeable(_token),
                _name,
                _symbol
            );            
        } else {
            token = address(
                new GovernanceWrappedERC20(
                    IERC20Upgradeable(_token), 
                    _name,
                    _symbol
                )
            );
        }
    }
    
    // @dev private helper method to set up the required base contracts on TokenFactory deployment.
    function setupBases() private {
        distributorBase = new MerkleDistributor();
        
        // Since we allow base contracts to be deployed as the native contracts as well,
        // we should be careful to pass arguments so that these base contracts are unusuable by themselves.
        // Might need a second eye in future.
        governanceERC20Base = address(new GovernanceERC20(IDAO(address(0)), "BaseToken","BaseSymbol"));

        governanceWrappedERC20Base = address(
            new GovernanceWrappedERC20(
                IERC20Upgradeable(address(0)), 
                "BaseToken" , 
                "BaseSymbol"
            )
        );

        merkleMinterBase = address(
            new MerkleMinter(
                IDAO(address(0)), 
                GovernanceERC20(address(0)), 
                MerkleDistributor(address(0)),
                address(0)
            )
        );
    }
}
