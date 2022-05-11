/*
 * SPDX-License-Identifier:    MIT
 */

/*
    DIRTY CONTRACT - should not be used in production, this is for POC purpose only
*/

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../core/DAO.sol";
import "./WhitelistVoting.sol";
import "../../utils/Proxy.sol";
import "../../APM/IApp.sol";

contract WhiteListFactory is IApp {
    using Address for address;
    using Clones for address;

    address public whitelistVotingBase;

    struct VoteConfig {
        uint64 participationRequiredPct;
        uint64 supportRequiredPct;
        uint64 minDuration;
    }

    constructor() {
        whitelistVotingBase = address(new WhitelistVoting());
    }

    function deploy(address dao, bytes calldata params) external returns (address whitelistVotingAddress) {
        DAO _dao = DAO(payable(dao));

        (
            uint256 participationRequiredPct,
            uint256 supportRequiredPct,
            uint256 minDuration,
            address[] memory whitelistVoters
        ) = abi.decode(params, (uint256, uint256, uint256, address[]));

        whitelistVotingAddress = createProxy(
            whitelistVotingBase,
            abi.encodeWithSelector(
                WhitelistVoting.initialize.selector,
                _dao,
                _dao.trustedForwarder(),
                participationRequiredPct,
                supportRequiredPct,
                minDuration,
                whitelistVoters
            )
        );
    }
}
