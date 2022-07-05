/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../core/DAO.sol";
import "./WhitelistVoting.sol";
import "../../utils/Proxy.sol";
import "../../plugin/IPluginFactory.sol";

contract WhitelistVotingFactory is IPluginFactory {
    using Address for address;
    using Clones for address;

    // TODO: Move it to MajorityVoting.
    struct VoteConfig {
        uint64 participationRequiredPct;
        uint64 supportRequiredPct;
        uint64 minDuration;
    }

    constructor() {
        basePluginAddress = address(new WhitelistVoting());
    }

    function deploy(address _dao, bytes calldata _params)
        external
        override
        returns (address pluginAddress)
    {
        DAO dao = DAO(payable(_dao));

        (VoteConfig memory _voteConfig, address[] memory whitelistVoters) = abi.decode(
            _params,
            (VoteConfig, address[])
        );

        pluginAddress = createProxy(
            basePluginAddress,
            abi.encodeWithSelector(
                WhitelistVoting.initialize.selector,
                dao,
                dao.trustedForwarder(),
                _voteConfig.participationRequiredPct,
                _voteConfig.supportRequiredPct,
                _voteConfig.minDuration,
                whitelistVoters
            )
        );
    }
}
