/**
 * IMPORTANT: Do not export classes from this file.
 * The classes of this file is meant to be incorporated into the classes of ./schemaBuilders.ts
 */

import {Address, BigInt, ethereum} from '@graphprotocol/graph-ts';
import {
  ERC20Contract,
  TokenVotingProposal,
  TokenVotingVote,
  TokenVotingVoter
} from '../../generated/schema';
import {VoteCast} from '../../generated/templates/TokenVoting/TokenVoting';
import {VOTER_OPTIONS, VOTE_OPTIONS} from '../../src/utils/constants';
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
  ZERO
} from '../constants';
import {createNewVoteCastEvent} from '../token/utils';
import {createGetProposalCall, createTotalVotingPowerCall} from '../utils';

class ERC20ContractMethods extends ERC20Contract {
  withDefaultValues(): ERC20ContractMethods {
    this.id = CONTRACT_ADDRESS;
    this.name = 'Test Token';
    this.symbol = 'TT';
    this.decimals = 18;

    return this;
  }
}
class TokenVotingVoterMethods extends TokenVotingVoter {
  withDefaultValues(): TokenVotingVoterMethods {
    this.id = ADDRESS_ONE;
    this.address = ADDRESS_ONE;
    this.plugin = CONTRACT_ADDRESS;
    this.lastUpdated = BigInt.fromString(ZERO);

    return this;
  }
}

class TokenVotingProposalMethods extends TokenVotingProposal {
  withDefaultValues(): TokenVotingProposalMethods {
    this.id = PROPOSAL_ENTITY_ID;

    this.dao = Address.fromString(DAO_ADDRESS).toHexString();
    this.plugin = Address.fromString(CONTRACT_ADDRESS).toHexString();
    this.proposalId = BigInt.fromString(PROPOSAL_ID);
    this.creator = Address.fromString(ADDRESS_ONE);

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

    this.totalVotingPower = BigInt.fromString(TOTAL_VOTING_POWER);
    this.allowFailureMap = BigInt.fromString(ALLOW_FAILURE_MAP);
    this.createdAt = BigInt.fromString(CREATED_AT);
    this.creationBlockNumber = BigInt.fromString(ZERO);
    this.executable = true;

    return this;
  }

  // calls
  // (only read call from contracts related to this)
  fireCall_getProposal(actions: ethereum.Tuple[]): void {
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

  fireCall_totalVotingPower(): void {
    createTotalVotingPowerCall(
      this.plugin,
      this.snapshotBlock.toString(),
      this.totalVotingPower.toString()
    );
  }

  // event
  fireEvent_VoteCast(
    voter: string,
    voterVoteOption: string,
    voterVotingPower: string
  ): VoteCast {
    let event = createNewVoteCastEvent(
      this.proposalId.toString(),
      voter,
      VOTE_OPTIONS.get(voterVoteOption) as string,
      voterVotingPower,
      this.plugin
    );
    return event;
  }
}

class TokenVotingVoteMethods extends TokenVotingVote {
  // build entity
  // if id not changed it will update
  withDefaultValues(): TokenVotingVoteMethods {
    this.id = ADDRESS_ONE.concat('_').concat(PROPOSAL_ENTITY_ID);
    this.voter = ADDRESS_ONE;
    this.proposal = PROPOSAL_ENTITY_ID;
    this.voteOption = VOTER_OPTIONS.get(0) as string;
    this.votingPower = BigInt.fromString(TWO);
    this.createdAt = BigInt.fromString(CREATED_AT);
    this.voteReplaced = false;
    this.updatedAt = BigInt.fromString(ZERO);

    return this;
  }
}
