import {
  VoteCast,
  VoteStarted,
  VoteExecuted,
  ConfigUpdated,
  UsersAdded,
  UsersRemoved,
  WhitelistVoting,
  TrustedForwarderSet
} from '../../../generated/templates/WhitelistVoting/WhitelistVoting';
import {
  Action,
  WhitelistPackage,
  WhitelistProposal,
  WhitelistVoter,
  WhitelistVote
} from '../../../generated/schema';
import {dataSource, store} from '@graphprotocol/graph-ts';
import {VOTER_STATE} from '../../utils/constants';

export function handleVoteStarted(event: VoteStarted): void {
  let context = dataSource.context();
  let daoId = context.getString('daoAddress');
  let metdata = event.params.metadata.toString();
  _handleVoteStarted(event, daoId, metdata);
}

// work around: to bypass context and ipfs for testing, as they are not yet supported by matchstick
export function _handleVoteStarted(
  event: VoteStarted,
  daoId: string,
  metadata: string
): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.voteId.toHexString();

  let proposalEntity = new WhitelistProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.pkg = event.address.toHexString();
  proposalEntity.voteId = event.params.voteId;
  proposalEntity.creator = event.params.creator;
  proposalEntity.metadata = metadata;
  proposalEntity.createdAt = event.block.timestamp;

  let contract = WhitelistVoting.bind(event.address);
  let vote = contract.try_getVote(event.params.voteId);

  if (!vote.reverted) {
    proposalEntity.open = vote.value.value0;
    proposalEntity.executed = vote.value.value1;
    proposalEntity.startDate = vote.value.value2;
    proposalEntity.endDate = vote.value.value3;
    proposalEntity.snapshotBlock = vote.value.value4;
    proposalEntity.supportRequiredPct = vote.value.value5;
    proposalEntity.participationRequired = vote.value.value6;
    proposalEntity.votingPower = vote.value.value7;

    // actions
    let actions = vote.value.value11;
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
  let packageEntity = WhitelistPackage.load(event.address.toHexString());
  if (packageEntity) {
    let voteLength = contract.try_votesLength();
    if (!voteLength.reverted) {
      packageEntity.votesLength = voteLength.value;
      packageEntity.save();
    }
  }
}

export function handleVoteCast(event: VoteCast): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.voteId.toHexString();
  let voterProposalId = event.params.voter.toHexString() + '_' + proposalId;
  let voterProposalEntity = WhitelistVote.load(voterProposalId);
  if (!voterProposalEntity) {
    voterProposalEntity = new WhitelistVote(voterProposalId);
    voterProposalEntity.voter = event.params.voter.toHexString();
    voterProposalEntity.proposal = proposalId;
  }
  voterProposalEntity.vote = VOTER_STATE.get(event.params.voterState);
  voterProposalEntity.weight = event.params.voterWeight;
  voterProposalEntity.createdAt = event.block.timestamp;
  voterProposalEntity.save();

  // update count
  let proposalEntity = WhitelistProposal.load(proposalId);
  if (proposalEntity) {
    let contract = WhitelistVoting.bind(event.address);
    let vote = contract.try_getVote(event.params.voteId);
    if (!vote.reverted) {
      proposalEntity.yea = vote.value.value8;
      proposalEntity.nay = vote.value.value9;
      proposalEntity.abstain = vote.value.value10;
      proposalEntity.save();
    }
  }
}

export function handleVoteExecuted(event: VoteExecuted): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.voteId.toHexString();
  let proposalEntity = WhitelistProposal.load(proposalId);
  if (proposalEntity) {
    proposalEntity.executed = true;
    proposalEntity.save();
  }

  // update actions
  let contract = WhitelistVoting.bind(event.address);
  let vote = contract.try_getVote(event.params.voteId);
  if (!vote.reverted) {
    let actions = vote.value.value10;
    for (let index = 0; index < actions.length; index++) {
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

export function handleConfigUpdated(event: ConfigUpdated): void {
  let packageEntity = WhitelistPackage.load(event.address.toHexString());
  if (packageEntity) {
    packageEntity.participationRequiredPct =
      event.params.participationRequiredPct;
    packageEntity.supportRequiredPct = event.params.supportRequiredPct;
    packageEntity.minDuration = event.params.minDuration;
    packageEntity.save();
  }
}

export function handleUsersAdded(event: UsersAdded): void {
  let users = event.params.users;
  for (let index = 0; index < users.length; index++) {
    const user = users[index];
    let voterEntity = WhitelistVoter.load(user.toHexString());
    if (!voterEntity) {
      voterEntity = new WhitelistVoter(user.toHexString());
      voterEntity.pkg = event.address.toHexString();
      voterEntity.save();
    }
  }
}

export function handleUsersRemoved(event: UsersRemoved): void {
  let users = event.params.users;
  for (let index = 0; index < users.length; index++) {
    const user = users[index];
    let voterEntity = WhitelistVoter.load(user.toHexString());
    if (voterEntity) {
      store.remove('WhitelistVoter', user.toHexString());
    }
  }
}

export function handleTrustedForwarderSet(event: TrustedForwarderSet): void {
  let packageEntity = WhitelistPackage.load(event.address.toHexString());
  if (packageEntity) {
    packageEntity.trustedForwarder = event.params.forwarder;
    packageEntity.save();
  }
}
