// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../voting/majority/MajorityVotingBase.sol";

contract MajorityVotingMock is MajorityVotingBase {
    function initializeMock(IDAO _dao, VotingSettings calldata _votingSettings) public initializer {
        __MajorityVotingBase_init(_dao, _votingSettings);
    }

    function createProposal(
        bytes calldata, /* _metadata */
        IDAO.Action[] calldata, /* _actions */
        uint64, /* _startDate */
        uint64, /* _endDate */
        VoteOption, /* _voteOption */
        bool /* _tryEarlyExecution */
    ) external view override returns (bytes32 proposalId) {
        return bytes32(bytes20(address(this))) | bytes32(0);
    }

    function _vote(
        bytes32, /* _proposalId */
        VoteOption, /* _voteOption */
        address, /* _voter */
        bool /* _tryEarlyExecution */
    ) internal pure override {}

    function _canVote(
        bytes32, /* _proposalId */
        address /* _voter */
    ) internal pure override returns (bool) {
        return true;
    }
}
