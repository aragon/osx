/*
 * SPDX-License-Identifier:    MIT
 */

/*
    DIRTY CONTRACT - should not be used in production, this is for POC purpose only
*/

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../core/DAO.sol";
import "./TestERC20Voting.sol";
import "../../plugin/aragonPlugin/PluginUUPSProxy.sol";
import "../../plugin/IPluginFactory.sol";
import "../../tokens/MerkleMinter.sol";
import "../../factory/TokenFactory.sol";

contract TestERC20VotingFactory is IPluginFactory {
    using Address for address;
    using Clones for address;

    TokenFactory public tokenFactory;

    struct VoteConfig {
        uint64 participationRequiredPct;
        uint64 supportRequiredPct;
        uint64 minDuration;
    }

    constructor(address _tokenFactory) {
        basePluginAddress = address(new TestERC20Voting());
        tokenFactory = TokenFactory(_tokenFactory);
    }

    /**
    future version/iteration of this facotry can be something like:
    
    constructor(address _tokenFactory, address pluginProxyAddress) {
        basePluginAddress = pluginProxyAddress

        tokenFactory = TokenFactory(_tokenFactory);
    }

    in case the PluginFactory have a bug
     */

    function deploy(address _dao, bytes calldata _params)
        external
        virtual
        override
        returns (address pluginAddress)
    {
        DAO dao = DAO(payable(_dao));

        (
            VoteConfig memory _voteConfig,
            TokenFactory.TokenConfig memory _tokenConfig,
            TokenFactory.MintConfig memory _mintConfig
        ) = abi.decode(_params, (VoteConfig, TokenFactory.TokenConfig, TokenFactory.MintConfig));

        // this require that the dao had given the necesary permission before
        // TODO: there must be a login here to determine if creating new token is needed
        (ERC20VotesUpgradeable token, ) = tokenFactory.newToken(dao, _tokenConfig, _mintConfig);

        pluginAddress = payable(
            address(
                new PluginUUPSProxy(
                    _dao,
                    basePluginAddress,
                    abi.encodeWithSelector(
                        TestERC20Voting.initialize.selector,
                        dao.trustedForwarder(),
                        _voteConfig.participationRequiredPct,
                        _voteConfig.supportRequiredPct,
                        _voteConfig.minDuration,
                        token
                    )
                )
            )
        );
    }
}
