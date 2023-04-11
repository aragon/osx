/**
 * IMPORTANT: Do not export classes from this file.
 * The classes of this file are meant to be incorporated into the classes of ./extended-schema.ts
 */

import {Address, bigInt, BigInt, ethereum} from '@graphprotocol/graph-ts';
import {log} from 'matchstick-as';
import {
  ERC20Contract,
  TokenVotingPlugin,
  TokenVotingProposal,
  TokenVotingVote,
  TokenVotingVoter
} from '../../generated/schema';
import {
  ProposalCreated,
  ProposalExecuted,
  VoteCast,
  VotingSettingsUpdated
} from '../../generated/templates/TokenVoting/TokenVoting';
import {
  VOTER_OPTIONS,
  VOTE_OPTIONS,
  VOTING_MODES,
  VOTING_MODE_INDEXES
} from '../../src/utils/constants';
import {
  ADDRESS_ONE,
  ALLOW_FAILURE_MAP,
  CONTRACT_ADDRESS,
  CREATED_AT,
  DAO_ADDRESS,
  END_DATE,
  MIN_VOTING_POWER,
  PROPOSAL_ENTITY_ID,
  PROPOSAL_ID,
  SNAPSHOT_BLOCK,
  START_DATE,
  SUPPORT_THRESHOLD,
  TOTAL_VOTING_POWER,
  TWO,
  VOTING_MODE,
  ZERO,
  MIN_PARTICIPATION,
  MIN_DURATION,
  ONE,
  DAO_TOKEN_ADDRESS,
  STRING_DATA
} from '../constants';
import {
  createNewProposalCreatedEvent,
  createNewProposalExecutedEvent,
  createNewVoteCastEvent,
  createNewVotingSettingsUpdatedEvent,
  getProposalCountCall
} from '../token/utils';
import {createGetProposalCall, createTotalVotingPowerCall} from '../utils';

class ERC20ContractMethods extends ERC20Contract {
  withDefaultValues(): ERC20ContractMethods {
    this.id = Address.fromHexString(CONTRACT_ADDRESS).toHexString();
    this.name = 'Test Token';
    this.symbol = 'TT';
    this.decimals = 18;

    return this;
  }
}
class TokenVotingVoterMethods extends TokenVotingVoter {
  withDefaultValues(): TokenVotingVoterMethods {
    this.id = Address.fromHexString(CONTRACT_ADDRESS)
      .toHexString()
      .concat('_')
      .concat(ADDRESS_ONE);
    this.address = ADDRESS_ONE;
    this.plugin = Address.fromHexString(CONTRACT_ADDRESS).toHexString();
    this.lastUpdated = BigInt.fromString(ZERO);

    return this;
  }
}

class TokenVotingProposalMethods extends TokenVotingProposal {
  withDefaultValues(): TokenVotingProposalMethods {
    this.id = PROPOSAL_ENTITY_ID;

    this.dao = DAO_ADDRESS;
    this.plugin = Address.fromHexString(CONTRACT_ADDRESS).toHexString();
    this.proposalId = BigInt.fromString(PROPOSAL_ID);
    this.creator = Address.fromHexString(ADDRESS_ONE);

    this.open = true;
    this.executed = false;

    this.votingMode = VOTING_MODE;
    this.supportThreshold = BigInt.fromString(SUPPORT_THRESHOLD);
    this.minVotingPower = BigInt.fromString(MIN_VOTING_POWER);
    this.startDate = BigInt.fromString(START_DATE);
    this.endDate = BigInt.fromString(END_DATE);
    this.snapshotBlock = BigInt.fromString(SNAPSHOT_BLOCK);

    this.yes = BigInt.fromString(ZERO);
    this.no = BigInt.fromString(ZERO);
    this.abstain = BigInt.fromString(ZERO);
    this.castedVotingPower = BigInt.fromString(ZERO);

    this.totalVotingPower = BigInt.fromString(TOTAL_VOTING_POWER);
    this.allowFailureMap = BigInt.fromString(ALLOW_FAILURE_MAP);
    this.createdAt = BigInt.fromString(CREATED_AT);
    this.creationBlockNumber = BigInt.fromString(ZERO);
    this.potentiallyExecutable = false;

    return this;
  }

  // calls
  // (only read call from contracts related to this)
  mockCall_getProposal(actions: ethereum.Tuple[]): void {
    if (!this.yes || !this.no || !this.abstain) {
      throw new Error('Yes, No, or Abstain can not be null');
    } else {
      createGetProposalCall(
        this.plugin,
        this.proposalId.toString(),
        this.open,
        this.executed,
        this.votingMode,
        this.supportThreshold.toString(),
        this.minVotingPower.toString(),
        this.startDate.toString(),
        this.endDate.toString(),
        this.snapshotBlock.toString(),
        (this.abstain as BigInt).toString(),
        (this.yes as BigInt).toString(),
        (this.no as BigInt).toString(),
        actions,
        this.allowFailureMap.toString()
      );
    }
  }

  mockCall_totalVotingPower(): void {
    createTotalVotingPowerCall(
      this.plugin,
      this.snapshotBlock.toString(),
      this.totalVotingPower.toString()
    );
  }

  // event
  createEvent_ProposalCreated(
    actions: ethereum.Tuple[],
    description: string = STRING_DATA
  ): ProposalCreated {
    let event = createNewProposalCreatedEvent(
      this.proposalId.toString(),
      this.creator.toHexString(),
      this.startDate.toString(),
      this.endDate.toString(),
      description,
      actions,
      this.allowFailureMap.toString(),
      this.plugin
    );

    return event;
  }

  createEvent_VoteCast(
    voter: string,
    voterVoteOption: string,
    voterVotingPower: string
  ): VoteCast {
    if (!VOTE_OPTIONS.has(voterVoteOption)) {
      throw new Error('Voter vote option is not valid.');
    }

    // we use casting here to remove autocompletion complaint
    // since we know it will be captured by the previous check
    let voteOption = VOTE_OPTIONS.get(voterVoteOption) as string;

    let event = createNewVoteCastEvent(
      this.proposalId.toString(),
      voter,
      voteOption,
      voterVotingPower,
      this.plugin
    );
    return event;
  }

  createEvent_ProposalExecuted(): ProposalExecuted {
    let event = createNewProposalExecutedEvent(
      this.proposalId.toString(),
      this.plugin
    );
    return event;
  }
}

class TokenVotingVoteMethods extends TokenVotingVote {
  // build entity
  // if id not changed it will update
  withDefaultValues(): TokenVotingVoteMethods {
    let voterOptionIndex = 0;
    if (!VOTER_OPTIONS.has(voterOptionIndex)) {
      throw new Error('Voter option is not valid.');
    }

    // we use casting here to remove autocompletion complaint
    // since we know it will be captured by the previous check
    let voterOption = VOTER_OPTIONS.get(voterOptionIndex) as string;

    this.id = ADDRESS_ONE.concat('_').concat(PROPOSAL_ENTITY_ID);
    this.voter = Address.fromHexString(CONTRACT_ADDRESS)
      .toHexString()
      .concat('_')
      .concat(ADDRESS_ONE);
    this.proposal = PROPOSAL_ENTITY_ID;
    this.voteOption = voterOption;
    this.votingPower = BigInt.fromString(TWO);
    this.createdAt = BigInt.fromString(CREATED_AT);
    this.voteReplaced = false;
    this.updatedAt = BigInt.fromString(ZERO);

    return this;
  }
}

class TokenVotingPluginMethods extends TokenVotingPlugin {
  // build entity
  // if id not changed it will update
  withDefaultValues(): TokenVotingPluginMethods {
    let votingModeIndex = parseInt(VOTING_MODE);
    if (!VOTING_MODES.has(votingModeIndex)) {
      throw new Error('voting mode is not valid.');
    }

    // we use casting here to remove autocompletion complaint
    // since we know it will be captured by the previous check
    let votingMode = VOTING_MODES.get(votingModeIndex) as string;

    const pluginAddress = Address.fromHexString(CONTRACT_ADDRESS);
    this.id = pluginAddress.toHexString();
    this.dao = DAO_ADDRESS;
    this.pluginAddress = pluginAddress;
    this.votingMode = votingMode;
    this.supportThreshold = BigInt.fromString(SUPPORT_THRESHOLD);
    this.minParticipation = BigInt.fromString(MIN_PARTICIPATION);
    this.minDuration = BigInt.fromString(MIN_DURATION);
    this.minProposerVotingPower = BigInt.zero();
    this.proposalCount = BigInt.zero();
    this.token = DAO_TOKEN_ADDRESS;

    return this;
  }

  mockCall_getProposalCountCall(): void {
    getProposalCountCall(
      this.pluginAddress.toHexString(),
      this.proposalCount.toString()
    );
  }

  createEvent_VotingSettingsUpdated(): VotingSettingsUpdated {
    if (this.votingMode === null) {
      throw new Error('Voting mode is null.');
    }

    // we cast to string only for stoping rust compiler complaints.
    let votingMode: string = this.votingMode as string;
    if (!VOTING_MODE_INDEXES.has(votingMode)) {
      throw new Error('Voting mode index is not valid.');
    }

    // we use casting here to remove autocompletion complaint
    // since we know it will be captured by the previous check
    let votingModeIndex = VOTING_MODE_INDEXES.get(votingMode) as string;

    let event = createNewVotingSettingsUpdatedEvent(
      votingModeIndex, // for event we need the index of the mapping to simulate the contract event
      (this.supportThreshold as BigInt).toString(),
      (this.minParticipation as BigInt).toString(),
      (this.minDuration as BigInt).toString(),
      (this.minProposerVotingPower as BigInt).toString(),
      this.pluginAddress.toHexString()
    );

    return event;
  }
}
