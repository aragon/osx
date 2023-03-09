import {Address, BigInt, ethereum} from '@graphprotocol/graph-ts';
import {assert, log} from 'matchstick-as';
import {TokenVotingProposal} from '../../../../generated/schema';
import {VoteCast} from '../../../../generated/templates/TokenVoting/TokenVoting';
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
  ZERO
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
      voterVoteOption,
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
      let entry = entries[i];
      let value = thisMap.get(entry.key) as string;
      assert.fieldEquals('TokenVotingProposal', this.id, entry.key, value);
    }
  }
}

// TODO we need an abstract class so all "builders follow the same pattern"
// class TokenVotingVoteBase {
//   public id: string = '';
//   public voter: string = '';
//   public proposal: string = '';
//   public voteOption: string = '';
//   public votingPower: string = '';
//   public createdAt: string = '';
//   public voteReplaced: string = '';
//   public updatedAt: string = '';
// }
