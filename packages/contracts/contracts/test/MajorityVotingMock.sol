// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../voting/majority/MajorityVotingBase.sol";

contract MajorityVotingMock is MajorityVotingBase {
    function versionRecipient() external pure override returns (string memory) {
        return "MajorityVotingMock";
    }

    function initializeMock(
        IDAO _dao,
        address _trustedForwarder,
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration
    ) public initializer {
        __MajorityVotingBase_init(
            _dao,
            _trustedForwarder,
            _participationRequiredPct,
            _supportRequiredPct,
            _minDuration
        );
    }

    function createVote(
        bytes calldata, /* _proposalMetadata */
        IDAO.Action[] calldata, /* _actions */
        uint64, /* _startDate */
        uint64, /* _endDate */
        bool, /* _executeIfDecided */
        VoteOption /* _choice */
    ) external pure override returns (uint256 voteId) {
        return 0;
    }

    function _vote(
        uint256, /* _voteId */
        VoteOption, /* _choice */
        address, /* _voter */
        bool /* _executesIfDecided */
    ) internal pure override {}

    function _canVote(
        uint256, /* _voteId */
        address /* _voter */
    ) internal pure override returns (bool) {
        return true;
    }
}
