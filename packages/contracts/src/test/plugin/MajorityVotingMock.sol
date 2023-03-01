// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "../../plugins/governance/majority-voting/MajorityVotingBase.sol";

contract MajorityVotingMock is MajorityVotingBase {
    function initializeMock(IDAO _dao, VotingSettings calldata _votingSettings) public initializer {
        __MajorityVotingBase_init(_dao, _votingSettings);
    }

    function createProposal(
        bytes calldata /* _metadata */,
        IDAO.Action[] calldata /* _actions */,
        uint256 /* _allowFailureMap */,
        uint64 /* _startDate */,
        uint64 /* _endDate */,
        VoteOption /* _voteOption */,
        bool /* _tryEarlyExecution */
    ) external pure override returns (uint256 proposalId) {
        return 0;
    }

    function totalVotingPower(uint256 /* _blockNumber */) public pure override returns (uint256) {
        return 0;
    }

    function _vote(
        uint256 /* _proposalId */,
        VoteOption /* _voteOption */,
        address /* _voter */,
        bool /* _tryEarlyExecution */
    ) internal pure override {}

    function _canVote(
        uint256 /* _proposalId */,
        address /* _voter */,
        VoteOption /* _voteOption */
    ) internal pure override returns (bool) {
        return true;
    }
}
