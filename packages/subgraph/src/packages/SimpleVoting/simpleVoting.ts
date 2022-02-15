import {
  CastVote,
  StartVote,
  ExecuteVote,
  UpdateConfig,
  SimpleVoting
} from '../../../generated/templates/SimpleVoting/SimpleVoting';
import {
  Action,
  EVPackage,
  EVProposal,
  EVVoter,
  EVVoterProposal
} from '../../../generated/schema';
import {BigInt, ByteArray, crypto, dataSource} from '@graphprotocol/graph-ts';

export function handleStartVote(event: StartVote): void {
  let context = dataSource.context();
  let daoId = context.getString('daoAddress');

  _handleStartVote(event, daoId);
}

export function _handleStartVote(event: StartVote, daoId: string): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.voteId.toHexString();

  let proposalEntity = new EVProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.pkg = event.address.toHexString();
  proposalEntity.evPkg = event.address.toHexString();
  proposalEntity.voteId = event.params.voteId;
  proposalEntity.creator = event.params.creator;
  proposalEntity.description = event.params.description.toString();
  proposalEntity.createdAt = event.block.timestamp;

  let contract = SimpleVoting.bind(event.address);
  let vote = contract.try_getVote(event.params.voteId);

  if (!vote.reverted) {
    proposalEntity.startDate = vote.value.value2;
    proposalEntity.snapshotBlock = vote.value.value3;
    proposalEntity.supportRequiredPct = vote.value.value4;
    proposalEntity.minAcceptQuorumPct = vote.value.value5;
    proposalEntity.votingPower = vote.value.value8;
    proposalEntity.executed = vote.value.value1;

    // actions
    let actions = vote.value.value9;
    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];

      let actionId =
        event.address.toHexString() +
        '_' +
        event.params.voteId.toHexString() +
        '_' +
        index.toString();

      let actionEntity = new Action(actionId);
      actionEntity.to = action.to;
      actionEntity.value = action.value;
      actionEntity.data = action.data;
      actionEntity.dao = daoId;
      actionEntity.proposal = proposalId;
      actionEntity.save();
    }
  }

  proposalEntity.save();

  // update vote length
  let packageEntity = EVPackage.load(event.address.toHexString());
  if (packageEntity) {
    let voteLength = contract.try_votesLength();
    if (!voteLength.reverted) {
      packageEntity.votesLength = voteLength.value;
      packageEntity.save();
    }
  }
}

export function handleCastVote(event: CastVote): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.voteId.toHexString();
  let voterProposalId = event.params.voter.toHexString() + '_' + proposalId;
  let voterProposalEntity = EVVoterProposal.load(voterProposalId);
  if (!voterProposalEntity) {
    voterProposalEntity = new EVVoterProposal(voterProposalId);
    voterProposalEntity.voter = event.params.voter.toHexString();
    voterProposalEntity.proposal = proposalId;
  }
  voterProposalEntity.vote = event.params.voterSupports;
  voterProposalEntity.stake = event.params.stake;
  voterProposalEntity.createdAt = event.block.timestamp;
  voterProposalEntity.save();

  // voter
  let voterEntity = EVVoter.load(event.params.voter.toHexString());
  if (!voterEntity) {
    voterEntity = new EVVoter(event.params.voter.toHexString());
    voterEntity.save();
  }

  // update count
  let proposalEntity = EVProposal.load(proposalId);
  if (proposalEntity) {
    let contract = SimpleVoting.bind(event.address);
    let vote = contract.try_getVote(event.params.voteId);
    if (!vote.reverted) {
      proposalEntity.yea = vote.value.value6;
      proposalEntity.nay = vote.value.value7;
      proposalEntity.save();
    }
  }
}

export function handleExecuteVote(event: ExecuteVote): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.voteId.toHexString();
  let proposalEntity = EVProposal.load(proposalId);
  if (proposalEntity) {
    proposalEntity.executed = true;
    proposalEntity.save();
  }

  // update actions
  let contract = SimpleVoting.bind(event.address);
  let vote = contract.try_getVote(event.params.voteId);
  if (!vote.reverted) {
    let actions = vote.value.value9;
    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];

      let actionId =
        event.address.toHexString() +
        '_' +
        event.params.voteId.toHexString() +
        '_' +
        index.toString();

      let actionEntity = Action.load(actionId);
      if (actionEntity) {
        actionEntity.execResult = event.params.execResults[index];
        actionEntity.save();
      }
    }
  }
}

export function handleUpdateConfig(event: UpdateConfig): void {
  let packageEntity = EVPackage.load(event.address.toHexString());
  if (packageEntity) {
    packageEntity.supportRequiredPct = event.params.supportRequiredPct;
    packageEntity.minAcceptQuorumPct = event.params.minAcceptQuorumPct;
    packageEntity.save();
  }
}
