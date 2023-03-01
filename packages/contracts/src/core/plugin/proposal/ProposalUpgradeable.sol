// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import "./IProposal.sol";

/// @title ProposalUgradeable
/// @author Aragon Association - 2022-2023
/// @notice An abstract contract containing the traits and internal functionality to create and execute proposals that can be inherited by upgradeable DAO plugins.
abstract contract ProposalUpgradeable is IProposal, ERC165Upgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /// @notice The incremental ID for proposals and executions.
    CountersUpgradeable.Counter private proposalCounter;

    /// @inheritdoc IProposal
    function proposalCount() public view override returns (uint256) {
        return proposalCounter.current();
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return _interfaceId == type(IProposal).interfaceId || super.supportsInterface(_interfaceId);
    }

    /// @notice Creates a proposal ID.
    /// @return proposalId The proposal ID.
    function _createProposalId() internal returns (uint256 proposalId) {
        proposalId = proposalCount();
        proposalCounter.increment();
    }

    /// @notice Internal function to create a proposal.
    /// @param _metadata The the proposal metadata.
    /// @param _startDate The start date of the proposal in seconds.
    /// @param _endDate The end date of the proposal in seconds.
    /// @param _allowFailureMap A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1, the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert.
    /// @param _actions The actions that will be executed after the proposal passes.
    /// @return proposalId The ID of the proposal.
    function _createProposal(
        address _creator,
        bytes calldata _metadata,
        uint64 _startDate,
        uint64 _endDate,
        IDAO.Action[] calldata _actions,
        uint256 _allowFailureMap
    ) internal virtual returns (uint256 proposalId) {
        proposalId = _createProposalId();

        emit ProposalCreated({
            proposalId: proposalId,
            creator: _creator,
            metadata: _metadata,
            startDate: _startDate,
            endDate: _endDate,
            actions: _actions,
            allowFailureMap: _allowFailureMap
        });
    }

    /// @notice Internal function to execute a proposal.
    /// @param _proposalId The ID of the proposal to be executed.
    /// @param _actions The array of actions to be executed.
    /// @param _allowFailureMap A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1, the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert.
    /// @return execResults The array with the results of the executed actions.
    /// @return failureMap The failure map encoding which actions have failed.
    function _executeProposal(
        IDAO _dao,
        uint256 _proposalId,
        IDAO.Action[] memory _actions,
        uint256 _allowFailureMap
    ) internal virtual returns (bytes[] memory execResults, uint256 failureMap) {
        (execResults, failureMap) = _dao.execute(bytes32(_proposalId), _actions, _allowFailureMap);
        emit ProposalExecuted({proposalId: _proposalId});
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
