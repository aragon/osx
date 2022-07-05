/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../core/DAO.sol";
import "./ERC20Voting.sol";
import "../../utils/Proxy.sol";
import "../../plugin/IPluginFactory.sol";
import "../../tokens/MerkleMinter.sol";
import "../../factory/TokenFactory.sol";

contract ERC20VotingFactory is IPluginFactory {
    using Address for address;
    using Clones for address;

    TokenFactory public tokenFactory;

    // TODO: Move it to MajorityVoting.
    struct VoteConfig {
        uint64 participationRequiredPct;
        uint64 supportRequiredPct;
        uint64 minDuration;
    }

    constructor(address _tokenFactory) {
        basePluginAddress = address(new ERC20Voting());
        tokenFactory = TokenFactory(_tokenFactory);
    }

    function deploy(address _dao, bytes calldata _params)
        external
        override
        returns (address pluginAddress)
    {
        DAO dao = DAO(payable(_dao));

        (
            VoteConfig memory _voteConfig,
            TokenFactory.TokenConfig memory _tokenConfig,
            TokenFactory.MintConfig memory _mintConfig
        ) = abi.decode(_params, (VoteConfig, TokenFactory.TokenConfig, TokenFactory.MintConfig));

        (ERC20VotesUpgradeable token, ) = tokenFactory.newToken(dao, _tokenConfig, _mintConfig);

        pluginAddress = createProxy(
            basePluginAddress,
            abi.encodeWithSelector(
                ERC20Voting.initialize.selector,
                dao,
                dao.trustedForwarder(),
                _voteConfig.participationRequiredPct,
                _voteConfig.supportRequiredPct,
                _voteConfig.minDuration,
                token
            )
        );
    }
}
