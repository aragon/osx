import {
  AllowedActionsAdded,
  ProcessExecuted,
  ProcessStarted
} from './../generated/templates/Process/Process';
import {
  ProcessHalted,
  ProcessForwarded,
  ProcessStopped
} from './../generated/templates/DisputableProcess/DisputableProcess';
import {VotedOnProcess} from './../generated/templates/VotingProcess/VotingProcess';
import {
  Action,
  AllowedAction,
  Execution,
  Proposal
} from './../generated/schema';
import {dataSource, store} from '@graphprotocol/graph-ts';
import {EXECUTION_STATES} from './utils/constants';

export function handleAllowedActionsAdded(event: AllowedActionsAdded): void {
  let processId = event.address.toHexString();
  let allowedActions = event.params.allowedActions;
  for (let index = 0; index < allowedActions.length; index++) {
    let allowedAction = allowedActions[index];
    let id = processId + '_' + allowedAction.toHexString();

    let entity = new AllowedAction(id);
    entity.process = processId;
    entity.allowedAction = allowedAction;
    entity.save();
  }
}

export function handleAllowedActionsRemoved(event: AllowedActionsAdded): void {
  let processId = event.address.toHexString();
  let allowedActions = event.params.allowedActions;
  for (let index = 0; index < allowedActions.length; index++) {
    let allowedAction = allowedActions[index];
    let id = processId + '_' + allowedAction.toHexString();

    let entity = AllowedAction.load(id);
    if (entity) {
      store.remove('AllowedAction', id);
    }
  }
}

export function handleProcessStarted(event: ProcessStarted): void {
  // get dao context
  let context = dataSource.context();
  let daoAddress = context.getString('daoAddress');

  let execution = event.params.execution;
  let proposal = execution.proposal;
  let id = event.address.toHexString() + '_' + execution.id.toHexString();

  // handle actions
  let actions = execution.proposal.actions;
  for (let index = 0; index < actions.length; index++) {
    let action = actions[index];
    let actionId =
      event.address.toHexString() +
      '_' +
      execution.id.toHexString() +
      '_' +
      index.toString();
    let actionEntity = new Action(actionId);

    actionEntity.to = action.to;
    actionEntity.value = action.value;
    actionEntity.data = action.data;

    actionEntity.proposal = id;

    actionEntity.save();
  }

  // handle proposal
  let proposalEntity = new Proposal(id);

  proposalEntity.dao = daoAddress;
  proposalEntity.process = event.address.toHexString();
  proposalEntity.metadata = event.params.metadata;
  proposalEntity.additionalArguments = proposal.additionalArguments;

  proposalEntity.save();

  // handle Execution
  let executionEntity = new Execution(id);

  executionEntity.dao = daoAddress;
  executionEntity.executionId = execution.id;
  executionEntity.proposal = id;
  executionEntity.state = EXECUTION_STATES.get(execution.state);

  executionEntity.save();
}

export function handleProcessStopped(event: ProcessStopped): void {}

export function handleProcessForwarded(event: ProcessForwarded): void {}

export function handleProcessHalted(event: ProcessHalted): void {}

export function handleVotedOnProcess(event: VotedOnProcess): void {}

export function handleProcessExecuted(event: ProcessExecuted): void {}
