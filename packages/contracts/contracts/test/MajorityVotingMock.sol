// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../voting/majority/MajorityVotingBase.sol";

contract MajorityVotingMock is MajorityVotingBase {
    function initializeMock(
        IDAO _dao,
        uint64 _supportThreshold,
        uint64 _minParticipation,
        uint64 _minDuration,
        uint256 _minProposerVotingPower
    ) public initializer {
        __MajorityVotingBase_init(
            _dao,
            _supportThreshold,
            _minParticipation,
            _minDuration,
            _minProposerVotingPower
        );
    }

    function createProposal(
        bytes calldata, /* _proposalMetadata */
        IDAO.Action[] calldata, /* _actions */
        uint64, /* _startDate */
        uint64, /* _endDate */
        bool, /* _executeIfDecided */
        VoteOption /* _choice */
    ) external pure override returns (uint256 proposalId) {
        return 0;
    }

    function _vote(
        uint256, /* _proposalId */
        VoteOption, /* _choice */
        address, /* _voter */
        bool /* _executesIfDecided */
    ) internal pure override {}

    function _canVote(
        uint256, /* _proposalId */
        address /* _voter */
    ) internal pure override returns (bool) {
        return true;
    }
}
