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
import "./ERC20Voting.sol";
import "../../utils/Proxy.sol";
import "../../APM/IPluginFactory.sol";
import "../../tokens/MerkleMinter.sol";
import "../../factory/TokenFactory.sol";

contract ERC20VotingFactory is IPluginFactory {
    using Address for address;
    using Clones for address;

    address public erc20VotingBase;
    TokenFactory public tokenFactory;

    struct VoteConfig {
        uint64 participationRequiredPct;
        uint64 supportRequiredPct;
        uint64 minDuration;
    }

    constructor(address _tokenFactory) {
        erc20VotingBase = address(new ERC20Voting());
        tokenFactory = TokenFactory(_tokenFactory);
    }

    function deploy(address dao, bytes calldata params) external returns (address erc20Voting) {
        DAO _dao = DAO(payable(dao));

        (
            VoteConfig memory _voteConfig,
            TokenFactory.TokenConfig memory _tokenConfig,
            TokenFactory.MintConfig memory _mintConfig
        ) = abi.decode(params, (VoteConfig, TokenFactory.TokenConfig, TokenFactory.MintConfig));

        (ERC20VotesUpgradeable token, ) = tokenFactory.newToken(_dao, _tokenConfig, _mintConfig);

        erc20Voting = createProxy(
            erc20VotingBase,
            abi.encodeWithSelector(
                ERC20Voting.initialize.selector,
                _dao,
                _dao.trustedForwarder(),
                _voteConfig.participationRequiredPct,
                _voteConfig.supportRequiredPct,
                _voteConfig.minDuration,
                token
            )
        );
    }
}
