import {BigInt} from '@graphprotocol/graph-ts';
import {
  Action,
  AddresslistVotingProposal,
  AdminProposal,
  MultisigProposal,
  TokenVotingProposal
} from '../../generated/schema';
import {
  Executed,
  ExecutedActionsStruct
} from '../../generated/templates/DaoTemplateV1_0_0/DAO';
import {
  ERC721_transferFrom,
  ERC721_safeTransferFromNoData,
  ERC721_safeTransferFromWithData,
  ERC20_transfer,
  ERC20_transferFrom
} from '../utils/tokens/common';
import {handleERC20Action} from '../utils/tokens/erc20';
import {handleERC721Action} from '../utils/tokens/erc721';
import {handleNativeAction} from '../utils/tokens/eth';

// AssemblyScript struggles having mutliple return types. Due to this,
// The below seems most effective way.
export function updateProposalWithFailureMap(
  proposalId: string,
  failureMap: BigInt
): boolean {
  let tokenVotingProposal = TokenVotingProposal.load(proposalId);
  if (tokenVotingProposal) {
    tokenVotingProposal.failureMap = failureMap;
    tokenVotingProposal.save();
    return true;
  }

  let multisigProposal = MultisigProposal.load(proposalId);
  if (multisigProposal) {
    multisigProposal.failureMap = failureMap;
    multisigProposal.save();
    return true;
  }

  let addresslistProposal = AddresslistVotingProposal.load(proposalId);
  if (addresslistProposal) {
    addresslistProposal.failureMap = failureMap;
    addresslistProposal.save();
    return true;
  }

  let adminProposal = AdminProposal.load(proposalId);
  if (adminProposal) {
    adminProposal.failureMap = failureMap;
    adminProposal.save();
    return true;
  }

  return false;
}

export function handleAction<
  T extends ExecutedActionsStruct,
  R extends Executed
>(action: T, proposalId: string, index: i32, event: R): void {
  let actionId = proposalId.concat('_').concat(index.toString());
  let actionEntity = Action.load(actionId);

  // In case the execute on the dao is called by the address
  // That we don't currently index for the actions in the subgraph,
  // we fallback and still create an action.
  // NOTE that it's important to generate action id differently to not allow overwriting.
  if (!actionEntity) {
    actionEntity = new Action(actionId);
    actionEntity.to = action.to;
    actionEntity.value = action.value;
    actionEntity.data = action.data;
    actionEntity.proposal = proposalId;
    actionEntity.dao = event.address.toHexString();
  }

  actionEntity.execResult = event.params.execResults[index];
  actionEntity.save();

  if (action.data.toHexString() == '0x' && action.value.gt(BigInt.zero())) {
    handleNativeAction(
      event.address,
      action.to,
      action.value,
      'Native Token Withdraw',
      proposalId,
      index,
      event
    );
    return;
  }

  let methodSig = action.data.toHexString().slice(0, 10);

  // Since ERC721 transferFrom and ERC20 transferFrom have the same signature,
  // The below first checks if it's ERC721 by calling `supportsInterface` and then
  // moves to ERC20 check. Currently, if `action` is transferFrom, it will still check
  // both `handleERC721Action`, `handleERC20Action`.
  if (
    methodSig == ERC721_transferFrom ||
    methodSig == ERC721_safeTransferFromNoData ||
    methodSig == ERC721_safeTransferFromWithData
  ) {
    handleERC721Action(
      action.to,
      event.address,
      action.data,
      proposalId,
      index,
      event
    );
  }

  if (methodSig == ERC20_transfer || methodSig == ERC20_transferFrom) {
    handleERC20Action(
      action.to,
      event.address,
      proposalId,
      action.data,
      index,
      event
    );
  }
}
