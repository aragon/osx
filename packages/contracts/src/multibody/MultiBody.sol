// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.8;
import "hardhat/console.sol";
import "./WriteOnce.sol";
import "@aragon/osx-commons-contracts/src/plugin/PluginUUPSUpgradeable.sol";
import "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

contract MultiBody is PluginUUPSUpgradeable {
    /// @notice The ID of the permission required to call the `advanceProposal` function.
    bytes32 public constant ADVANCE_PROPOSAL_PERMISSION_ID =
        keccak256("ADVANCE_PROPOSAL_PERMISSION");

    /// @notice The ID of the permission required to call the `updateStages` function.
    bytes32 public constant UPDATE_STAGES_PERMISSION_ID = keccak256("UPDATE_STAGES_PERMISSION");

    // Stage Settings
    struct Stage {
        address[] plugins;
        address[] allowedBodies;
        uint64 maxDuration;
        uint64 minDuration;
        uint64 resultThreshold;
        bool isOptimistic;
    }

    mapping(uint => Stage[]) public stages;

    uint32 public currentConfigIndex; // Index from `stages` above

    address public executor;

    bytes private pluginsMetadata;

    struct Proposal {
        uint256 allowFailureMap;
        address creator;
        uint64 lastStageTransition;
        bytes metadata;
        IDAO.Action[] actions;
        address creationCalldatasPointer;
        uint32 currentStage; // At which stage the proposal is.
        uint32 stageConfigIndex; // Which stages approach the proposal is using
        bool executed;
    }

    mapping(bytes32 => Proposal) proposals;

    mapping(bytes32 => mapping(uint256 => mapping(address => bool))) private pluginResults;

    error ProposalNotExists();
    error CallerNotABody();
    error ProposalCannotExecute(bytes32);

    function initialize(
        IDAO _dao,
        address _executor,
        Stage[] calldata _stages,
        bytes calldata _pluginsMetadata // This is the IPFS url where function abi of creating a proposal on each plugin is described
    ) external initializer {
        __PluginUUPSUpgradeable_init(_dao);

        _updateStages(_stages, _pluginsMetadata);

        executor = _executor;
    }

    // This will be called by DAO. Since multibody is the only one that can call dao,
    // in order to update the stages, proposal must go through the current setting/stages.
    // Once updateStages is successful, the Multibody will continue using the newly
    // requirement stages until members decide to update it once more. This design
    // is better than having a chance to have different stages per proposal as proposer
    // might really use whatever stages he wants(i.e he will only use one stage with one plugin)
    // and circumvent the flow.
    function updateStages(
        Stage[] calldata _stages,
        bytes calldata _pluginsMetadata
    ) public auth(UPDATE_STAGES_PERMISSION_ID) {
        _updateStages(_stages, _pluginsMetadata);
    }

    function _updateStages(Stage[] calldata _stages, bytes calldata _pluginsMetadata) private {
        Stage[] storage stages = stages[++currentConfigIndex];

        for (uint i = 0; i < _stages.length; i++) {
            stages.push(_stages[i]);
        }

        pluginsMetadata = _pluginsMetadata;
    }

    // After EOA calls this function here, he must create the following
    // on the TokenVoting => actions=[{to: MultiBody, value: 0, data: executeSelector + proposalId}]
    // Note that _stagesCalldatas already need to have `proposalId` included in it
    // otherwise, when plugin calls `execute`, how would it know the proposalId ?
    // This means that front-running could occur such that if I call `createProposal` below,
    // and I include _stagesCalldatas below to have proposalId 3, someone else might front-run this
    // and his proposal will be created, but note that i am including _stageCalldatas in the generation
    // of proposalId and this removes the risk completely. Without including _stageCalldatas,
    // front-run could do lots of damage - Ask me if you don't understand.
    function createProposal(
        IDAO.Action[] calldata _actions,
        uint256 _allowFailureMap,
        bytes calldata _metadata,
        bytes[][] calldata _data // These are calldatas of what function selector + params must be called on each plugin for proposal creation.
    ) public returns (bytes32 proposalId) {
        proposalId = keccak256(
            abi.encode(
                _actions,
                _allowFailureMap,
                _metadata,
                address(this),
                block.chainid,
                // _creationProposalCalldatas
                msg.sender
            )
        );

        Proposal storage proposal = proposals[proposalId];

        proposal.allowFailureMap = _allowFailureMap;
        proposal.metadata = _metadata;
        proposal.creator = msg.sender;
        proposal.stageConfigIndex = currentConfigIndex;
        proposal.currentStage = 0;
        proposal.lastStageTransition = uint64(block.timestamp);

        for (uint i = 0; i < _actions.length; i++) {
            proposal.actions.push(_actions[i]);
        }

        // If `_creationProposalCalldatas` is greater than 1, that means
        // user wants Multibody to create proposals automatically on stages > 1
        if (_data.length > 1) {
            bytes[][] memory slicedData = new bytes[][](_data.length - 1);
            for (uint i = 1; i < _data.length; i++) {
                slicedData[i - 1] = _data[i];
            }
            proposals[proposalId].creationCalldatasPointer = WriteOnce.store(abi.encode(slicedData));
        }

        // Note that we need to still store bodies/stages per each proposal.
        // This is because if proposal is still open and hasn't gone through all stages,
        // and somehow another proposal wins(which is `updateStages`), the old/unfinished
        // proposal must still use the stages before the update. That's why
        // it's so important to encode bodies/stages with logical operators in a very optimized way.
        // Also note that we could not store stage requirements, but only the hash of it and ask
        // users to pass the stages in the calldata and we would compare it with the hash, but
        // problem is that inside `execute` below, we need to have that information available.
        // Since `execute` is called by the plugins(through Executor), they won't pass this huge information.
        // so i guess, we will store bodies/stages per each proposal until we got a better way.

        address[] memory stageZeroPlugins = stages[currentConfigIndex][0].plugins;

        for (uint i = 0; i < stageZeroPlugins.length; i++) {
            address target = stageZeroPlugins[i];

            if (_data[0][i].length >= 4) {
                (bool success, ) = target.call{value: 0}(_data[0][i]);
                require(success);
                // TODO: record results and emit the event
                // decide whether to still not revert the outer tx or not if some of them
                // were not created.
            }
        }
    }

    function getProposal(bytes32 _proposalId) public view returns (Proposal memory) {
        return proposals[_proposalId];
    }

    function isBodyAllowed(
        address body,
        address[] storage allowedBodies
    ) private view returns (uint256) {
        uint256 index = type(uint256).max;
        for (uint i = 0; i < allowedBodies.length; i++) {
            if (body == allowedBodies[i]) {
                index = i;
            }
        }
        return index;
    }

    // When multibody is installed, the below can be called by ANY_ADDR as
    // this is the exact permission that was applied
    // The reason why we're using auth is that once plugin removal happens, we will
    // revoke this function so it can not be called by anyone at all.
    function advanceProposal(bytes32 proposalId) public {
        address sender = msg.sender;
        // if sender is a trusted executor, that means
        // it would appended the sender in the calldata
        if (msg.data.length >= 20 && msg.sender == executor) {
            assembly {
                // get the last 20 bytes as an address which was appended
                // by the executor before calling this function.
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        }

        // Note that sometimes, `sender` will be the executor - in most cases,
        // when developers/members don't care about using their custom subdaos as executors).
        // and most of the time, sender will be the plugin addresses(tokenvoting, multisig).
        // It could happen that inside dao's multibody, there are two bodies such that
        // one of them is TokenVoting address, and another one is the subdao executor.
        // This might be inconsistency but in the end, bodies are just addresses and this
        // multibody contract should be agnostic about this - i.e multibody doesn't care
        // whether the caller is plugin or subdao or whatever shit. It cares only whether
        // this address is added or not inside bodies.
        Proposal storage proposal = proposals[proposalId];
        if (proposal.actions.length == 0) {
            revert ProposalNotExists();
        }

        Stage[] storage _stages = stages[proposal.stageConfigIndex];
        Stage storage stage = _stages[proposal.currentStage];

        uint256 index = isBodyAllowed(sender, stage.allowedBodies);
        if (index == type(uint256).max) {
            revert CallerNotABody();
        }

        // record/store that plugin actually called the advanceProposal.
        pluginResults[proposalId][proposal.currentStage][stage.plugins[index]] = true;

        // TODO: If one plugin only and one stage, canProposalAdvance is called 2 times as
        // executeProposal also calls it. Fix it.
        if (canProposalAdvance(proposalId)) {
            address dataPointer = proposal.creationCalldatasPointer;
            if (proposal.currentStage < _stages.length - 1) {
                uint32 nextStageIndex = proposal.currentStage + 1;
                Stage storage nextStage = _stages[nextStageIndex];
                address[] memory nextStagePlugins = nextStage.plugins;

                proposal.currentStage = nextStageIndex;
                proposal.lastStageTransition = uint64(block.timestamp);
                if (dataPointer != address(0)) {
                    bytes[][] memory data = abi.decode(WriteOnce.load(dataPointer), (bytes[][]));
                    for (uint i = 0; i < nextStagePlugins.length; i++) {
                        address plugin = nextStagePlugins[i];
                        // minus one because we stored calldatas in createProposal, starting from > 1
                        if (data[nextStageIndex - 1][i].length >= 4) {
                            (bool success, ) = plugin.call{value: 0}(data[nextStageIndex - 1][i]);
                            // TODO: record results and emit the event
                            // decide whether to still not revert the outer tx or not if some of them
                            // were not created.
                        }
                    }
                }
            } else {
                _executeProposal(proposalId);
            }
        }
    }

    function canProposalAdvance(bytes32 _proposalId) public view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.executed) {
            return false;
        }

        Stage storage stage = stages[proposal.stageConfigIndex][proposal.currentStage];

        if (proposal.lastStageTransition + stage.maxDuration < block.timestamp) {
            return false;
        }

        if (proposal.lastStageTransition + stage.minDuration > block.timestamp) {
            return false;
        }

        uint256 count = 0;
        for (uint256 i = 0; i < stage.plugins.length; ) {
            if (pluginResults[_proposalId][proposal.currentStage][stage.plugins[i]]) {
                ++count;
            }

            unchecked {
                ++i;
            }
        }

        // if the stage is optimistic the votes should be seens as vetos and not approvals
        if (stage.isOptimistic) {
            if (count > stage.resultThreshold) {
                return false;
            }
            return true;
        }

        if (count > stage.resultThreshold - 1) {
            return true;
        }

        return false;
    }

    function executeProposal(bytes32 _proposalId) public {
        if (!canProposalExecute(_proposalId)) {
            revert ProposalCannotExecute(_proposalId);
        }

        _executeProposal(_proposalId);
    }

    function _executeProposal(bytes32 _proposalId) private {
        Proposal storage proposal = proposals[_proposalId];
        proposal.executed = true;

        dao().execute(_proposalId, proposal.actions, proposal.allowFailureMap);
    }

    function canProposalExecute(bytes32 _proposalId) public view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];

        Stage[] storage _stages = stages[proposal.stageConfigIndex];

        if (proposal.currentStage == _stages.length - 1 && canProposalAdvance(_proposalId)) {
            return true;
        }

        return false;
    }
}
