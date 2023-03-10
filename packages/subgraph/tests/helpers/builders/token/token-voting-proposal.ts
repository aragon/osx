import {Address, BigInt, ethereum} from '@graphprotocol/graph-ts';
import {assert, log} from 'matchstick-as';
import {
  TokenVotingProposal,
  TokenVotingVote
} from '../../../../generated/schema';
import {VoteCast} from '../../../../generated/templates/TokenVoting/TokenVoting';
import {VOTER_OPTIONS, VOTE_OPTIONS} from '../../../../src/utils/constants';
import {
  ADDRESS_ONE,
  ALLOW_FAILURE_MAP,
  CONTRACT_ADDRESS,
  CREATED_AT,
  DAO_ADDRESS,
  ADDRESS_ZERO,
  END_DATE,
  MIN_VOTING_POWER,
  PROPOSAL_ENTITY_ID,
  PROPOSAL_ID,
  SNAPSHOT_BLOCK,
  START_DATE,
  SUPPORT_THRESHOLD,
  VOTING_MODE,
  TOTAL_VOTING_POWER,
  ZERO,
  TWO
} from '../../../constants';
import {createNewVoteCastEvent} from '../../../token/utils';
import {
  createGetProposalCall,
  createTotalVotingPowerCall
} from '../../../utils';

export class TokenVotingProposalBuilder {
  // proposal
  public id: string = PROPOSAL_ENTITY_ID;
  public dao: string = DAO_ADDRESS;
  public allowFailureMap: string = ALLOW_FAILURE_MAP;
  public failureMap: string = ZERO;
  public plugin: string = CONTRACT_ADDRESS;
  public proposalId: string = PROPOSAL_ID;
  public creator: string = ADDRESS_ONE;

  public votingMode: string = VOTING_MODE;
  public supportThreshold: string = SUPPORT_THRESHOLD;
  public minVotingPower: string = MIN_VOTING_POWER;
  public snapshotBlock: string = SNAPSHOT_BLOCK;

  public yes: string = ZERO;
  public no: string = ZERO;
  public abstain: string = ZERO;
  public castedVotingPower: string = ZERO;
  public totalVotingPower: string = TOTAL_VOTING_POWER;

  public open: string = 'true';
  public executed: string = 'false';
  public createdAt: string = CREATED_AT;
  public startDate: string = START_DATE;
  public endDate: string = END_DATE;
  public creationBlockNumber: string = ZERO;
  public executable: string = 'false';
  public executionDate: string = ZERO;
  public executionBlockNumber: string = ZERO;
  public executionTxHash: string = ADDRESS_ZERO;

  // calls
  // (only read call from contracts related to this)
  fireCall_getProposal(actions: ethereum.Tuple[]): void {
    createGetProposalCall(
      this.plugin,
      this.proposalId,
      this.open === 'true',
      this.executed === 'true',
      this.votingMode,
      this.supportThreshold,
      this.minVotingPower,
      this.startDate,
      this.endDate,
      this.snapshotBlock,
      this.abstain,
      this.yes,
      this.no,
      actions,
      this.allowFailureMap
    );
  }

  fireCall_totalVotingPower(): void {
    createTotalVotingPowerCall(
      this.plugin,
      this.snapshotBlock,
      this.totalVotingPower
    );
  }

  // build entity
  // if id not changed it will update
  buildOrUpdateEntity(): TokenVotingProposal {
    let entity = new TokenVotingProposal(this.id);

    entity.dao = Address.fromString(this.dao).toHexString();
    entity.plugin = Address.fromString(this.plugin).toHexString();
    entity.proposalId = BigInt.fromString(this.proposalId);
    entity.creator = Address.fromString(this.creator);

    entity.open = this.open === 'true';
    entity.executed = this.executed === 'true';

    entity.votingMode = this.votingMode;
    entity.supportThreshold = BigInt.fromString(this.supportThreshold);
    entity.minVotingPower = BigInt.fromString(this.minVotingPower);
    entity.startDate = BigInt.fromString(this.startDate);
    entity.endDate = BigInt.fromString(this.endDate);
    entity.snapshotBlock = BigInt.fromString(this.snapshotBlock);

    entity.totalVotingPower = BigInt.fromString(this.totalVotingPower);
    entity.allowFailureMap = BigInt.fromString(this.allowFailureMap);
    entity.createdAt = BigInt.fromString(this.createdAt);
    entity.creationBlockNumber = BigInt.fromString(this.creationBlockNumber);
    entity.executable = this.executable === 'true';

    entity.save();
    return entity;
  }

  // event
  fireEvent_VoteCast(
    voter: string,
    voterVoteOption: string,
    voterVotingPower: string
  ): VoteCast {
    let event = createNewVoteCastEvent(
      this.proposalId,
      voter,
      VOTE_OPTIONS.get(voterVoteOption) as string,
      voterVotingPower,
      this.plugin
    );
    return event;
  }

  toMap(): Map<string, string> {
    return new Map<string, string>()
      .set('id', this.id)
      .set('dao', Address.fromString(this.dao).toHexString())
      .set('allowFailureMap', this.allowFailureMap)
      .set('failureMap', this.failureMap)
      .set('plugin', Address.fromString(this.plugin).toHexString())
      .set('proposalId', this.proposalId)
      .set('creator', Address.fromString(this.creator).toHexString())
      .set('votingMode', this.votingMode)
      .set('supportThreshold', this.supportThreshold)
      .set('minVotingPower', this.minVotingPower)
      .set('snapshotBlock', this.snapshotBlock)
      .set('yes', this.yes)
      .set('no', this.no)
      .set('abstain', this.abstain)
      .set('castedVotingPower', this.castedVotingPower)
      .set('totalVotingPower', this.totalVotingPower)
      .set('open', this.open)
      .set('executed', this.executed)
      .set('createdAt', this.createdAt)
      .set('startDate', this.startDate)
      .set('endDate', this.endDate)
      .set('creationBlockNumber', this.creationBlockNumber)
      .set('executable', this.executable)
      .set('executionDate', this.executionDate)
      .set('executionBlockNumber', this.executionBlockNumber)
      .set('executionTxHash', this.executionTxHash);
  }

  // assertions
  assertEntity(): void {
    let entity = TokenVotingProposal.load(this.id);
    if (!entity) throw new Error(`Entity not found for id: ${this.id}`);

    let thisMap = this.toMap();

    let entries = entity.entries;

    for (let i = 0; i < entries.length; i++) {
      let key = entries[i].key;
      let value = thisMap.get(key) as string;
      assert.fieldEquals('TokenVotingProposal', this.id, key, value);
    }
  }
}

// TODO we need an abstract class so all "builders follow the same pattern"
export class TokenVotingVoteBuilder {
  public id: string = ADDRESS_ONE.concat('_').concat(PROPOSAL_ENTITY_ID);
  public voter: string = ADDRESS_ONE;
  public proposal: string = PROPOSAL_ENTITY_ID;
  public voteOption: string = VOTER_OPTIONS.get(0) as string;
  public votingPower: string = TWO;
  public createdAt: string = CREATED_AT;
  public voteReplaced: string = 'false';
  public updatedAt: string = ZERO;

  // build entity
  // if id not changed it will update
  buildOrUpdateEntity(): TokenVotingVote {
    let entity = new TokenVotingVote(this.id);

    entity.voter = CONTRACT_ADDRESS.concat('_').concat(this.voter);
    entity.proposal = this.proposal;
    entity.voteOption = this.voteOption;
    entity.votingPower = BigInt.fromString(this.votingPower);
    entity.createdAt = BigInt.fromString(this.createdAt);
    entity.voteReplaced = this.voteReplaced === 'true';
    entity.updatedAt = BigInt.fromString(this.updatedAt);

    entity.save();
    return entity;
  }

  toMap(): Map<string, string> {
    return new Map<string, string>()
      .set('id', this.id)
      .set(
        'voter',
        Address.fromHexString(CONTRACT_ADDRESS)
          .toHexString()
          .concat('_')
          .concat(this.voter)
      )
      .set('proposal', this.proposal)
      .set('voteOption', this.voteOption)
      .set('votingPower', this.votingPower)
      .set('createdAt', this.createdAt)
      .set('voteReplaced', this.voteReplaced)
      .set('updatedAt', this.updatedAt);
  }

  // assertions
  assertEntity(): void {
    let entity = TokenVotingVote.load(this.id);
    if (!entity) throw new Error(`Entity not found for id: ${this.id}`);

    let thisMap = this.toMap();

    let entries = entity.entries;
    for (let i = 0; i < entries.length; i++) {
      let key = entries[i].key;
      log.debug('getting for key = {}', [key]);
      let value = thisMap.get(key) as string;

      log.debug('testing key = {}, value = {}', [key, value]);

      assert.fieldEquals('TokenVotingVote', this.id, key, value);
    }
  }
}
