// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../voting/majority/MajorityVotingBase.sol";

contract MajorityVotingMock is MajorityVotingBase {
    function initializeMock(IDAO _dao, MajorityVotingSettings calldata _majorityVotingSettings)
        public
        initializer
    {
        __MajorityVotingBase_init(_dao, _majorityVotingSettings);
    }

    function createProposal(
        bytes calldata, /* _proposalMetadata */
        IDAO.Action[] calldata, /* _actions */
        uint64, /* _startDate */
        uint64, /* _endDate */
        bool, /* _tryEarlyExecution */
        VoteOption /* _voteOption */
    ) external pure override returns (uint256 proposalId) {
        return 0;
    }

    function _vote(
        uint256, /* _proposalId */
        VoteOption, /* _voteOption */
        address, /* _voter */
        bool /* _tryEarlyExecution */
    ) internal pure override {}

    function _canVote(
        uint256, /* _proposalId */
        address /* _voter */
    ) internal pure override returns (bool) {
        return true;
    }
}
