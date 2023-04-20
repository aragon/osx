import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {bigInt, BigInt} from '@graphprotocol/graph-ts';

import {
  handleVoteCast,
  handleProposalExecuted,
  handleVotingSettingsUpdated,
  _handleProposalCreated,
  handleMembershipContractAnnounced
} from '../../src/packages/token/token-voting';
import {
  VOTING_MODES,
  WRAPPED_ERC20_INTERFACE
} from '../../src/utils/constants';
import {
  DAO_TOKEN_ADDRESS,
  STRING_DATA,
  VOTING_MODE,
  ONE,
  ZERO,
  TWO
} from '../constants';

import {createDummyActions} from '../utils';
import {
  ExtendedERC20Contract,
  ExtendedERC20WrapperContract,
  ExtendedTokenVotingPlugin,
  ExtendedTokenVotingProposal,
  ExtendedTokenVotingVote,
  ExtendedTokenVotingVoter
} from '../helpers/extended-schema';
import {getSupportsInterface} from '../dao/utils';

let actions = createDummyActions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run TokenVoting (handleProposalCreated) mappings with mock event', () => {
  // create state
  let tokenVotingPlugin = new ExtendedTokenVotingPlugin().withDefaultValues();
  tokenVotingPlugin.buildOrUpdate();
  // assert with default value
  // eg. proposalCount is `0`.
  tokenVotingPlugin.assertEntity();

  let proposal = new ExtendedTokenVotingProposal().withDefaultValues();

  // create calls
  tokenVotingPlugin.proposalCount = BigInt.fromString(ONE);
  tokenVotingPlugin.mockCall_getProposalCountCall();
  proposal.mockCall_getProposal(actions);
  proposal.mockCall_totalVotingPower();

  // create event
  let event = proposal.createEvent_ProposalCreated(actions, STRING_DATA);

  // handle event
  _handleProposalCreated(event, proposal.dao, STRING_DATA);

  // checks
  // expected changes
  proposal.creationBlockNumber = BigInt.fromString(ONE);
  proposal.votingMode = VOTING_MODES.get(parseInt(VOTING_MODE)) as string;
  // check TokenVotingProposal
  proposal.assertEntity();

  // check TokenVotingPlugin
  tokenVotingPlugin.assertEntity();

  clearStore();
});

test('Run TokenVoting (handleVoteCast) mappings with mock event', () => {
  // create state
  let proposal = new ExtendedTokenVotingProposal().withDefaultValues();

  proposal.buildOrUpdate();

  // check proposal entity
  proposal.assertEntity();

  // // create calls
  proposal.yes = bigInt.fromString(ONE);
  proposal.mockCall_getProposal(actions);
  proposal.mockCall_totalVotingPower();

  // create event
  let voter = new ExtendedTokenVotingVoter().withDefaultValues();

  let vote = new ExtendedTokenVotingVote().withDefaultValues();
  vote.voteOption = 'Yes';
  vote.votingPower = bigInt.fromString(ONE);

  // fire an event of `VoteCast` with voter info.
  let event = proposal.createEvent_VoteCast(
    voter.address,
    vote.voteOption,
    vote.votingPower.toString()
  );

  // test handler
  handleVoteCast(event);

  // checks vote entity created via handler (not builder)
  vote.assertEntity();

  // check proposal
  // expected changes to the proposal entity
  proposal.castedVotingPower = BigInt.fromString(ONE);
  proposal.potentiallyExecutable = false;
  // assert proposal entity
  proposal.assertEntity();

  // Check when voter replace vote
  // create calls 2
  proposal.yes = BigInt.fromString(ZERO);
  proposal.no = BigInt.fromString(ONE);
  proposal.mockCall_getProposal(actions);
  proposal.mockCall_totalVotingPower();

  vote.voteOption = 'No';

  let event2 = proposal.createEvent_VoteCast(
    voter.address,
    vote.voteOption,
    vote.votingPower.toString()
  );

  handleVoteCast(event2);

  // expected changes in TokenVotingVote
  vote.voteReplaced = true;
  vote.updatedAt = bigInt.fromString(ONE);

  // checks vote entity created via handler (not builder)
  vote.assertEntity();

  // create calls 3
  proposal.yes = BigInt.fromString(TWO);
  proposal.no = BigInt.fromString(ZERO);
  proposal.mockCall_getProposal(actions);

  vote.voteOption = 'Yes';

  let event3 = proposal.createEvent_VoteCast(
    voter.address,
    vote.voteOption,
    vote.votingPower.toString()
  );

  handleVoteCast(event3);

  // expected changes to the proposal entity
  proposal.potentiallyExecutable = true;
  proposal.castedVotingPower = BigInt.fromString(TWO);

  proposal.assertEntity();

  clearStore();
});

test('Run TokenVoting (handleVoteCast) mappings with mock event and vote option "None"', () => {
  let proposal = new ExtendedTokenVotingProposal().withDefaultValues();

  // create calls
  proposal.mockCall_getProposal(actions);

  // create event
  let voter = new ExtendedTokenVotingVoter().withDefaultValues();
  let vote = new ExtendedTokenVotingVote().withDefaultValues();
  vote.voteOption = 'None';
  vote.votingPower = BigInt.fromString(ONE);

  let event = proposal.createEvent_VoteCast(
    voter.address,
    vote.voteOption,
    vote.votingPower.toString()
  );

  handleVoteCast(event);

  // checks TokenVotingVoter
  assert.notInStore('TokenVotingVoter', voter.id);

  clearStore();
});

test('Run TokenVoting (handleProposalExecuted) mappings with mock event', () => {
  // create state
  let proposal = new ExtendedTokenVotingProposal().withDefaultValues();
  proposal.yes = BigInt.fromString(ONE);
  proposal.buildOrUpdate();

  // create calls
  proposal.mockCall_getProposal(actions);

  // create event
  let event = proposal.createEvent_ProposalExecuted();

  // handle event
  handleProposalExecuted(event);

  // checks
  // expected changes
  proposal.executed = true;
  // assert TokenVotingProposal
  proposal.assertEntity();

  clearStore();
});

test('Run TokenVoting (handleVotingSettingsUpdated) mappings with mock event', () => {
  // create state
  let tokenVotingPlugin = new ExtendedTokenVotingPlugin().withDefaultValues();
  tokenVotingPlugin.buildOrUpdate();

  // create event
  let event = tokenVotingPlugin.createEvent_VotingSettingsUpdated();

  // handle event
  handleVotingSettingsUpdated(event);

  // checks
  tokenVotingPlugin.assertEntity();

  clearStore();
});

test('Run TokenVoting (handleMembershipContractAnnounced) with a wrapped token and a mocke event', () => {
  // create entities
  let tokenVotingPlugin = new ExtendedTokenVotingPlugin().withDefaultValues();
  let erc20Contract = new ExtendedERC20Contract().withDefaultValues();
  let erc20WrappedContract = new ExtendedERC20WrapperContract().withDefaultValues();
  // mock support interface
  getSupportsInterface(erc20WrappedContract.id, WRAPPED_ERC20_INTERFACE, true);
  getSupportsInterface(erc20WrappedContract.id, '00000000', false);
  // save entities
  tokenVotingPlugin.token = erc20WrappedContract.id;
  tokenVotingPlugin.buildOrUpdate();
  erc20Contract.buildOrUpdate();
  erc20WrappedContract.buildOrUpdate();

  // create event
  let event = tokenVotingPlugin.createEvent_MembershipContractAnnounced();

  // handle event
  handleMembershipContractAnnounced(event);

  // assert
  tokenVotingPlugin.assertEntity();
  erc20Contract.assertEntity();
  erc20WrappedContract.assertEntity();

  clearStore();
});
