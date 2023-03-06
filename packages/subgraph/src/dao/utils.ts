import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  ethereum
} from '@graphprotocol/graph-ts';
import {
  AddresslistVotingProposal,
  AdminProposal,
  MultisigProposal,
  TokenVotingProposal,
  TransactionActionsProposal
} from '../../generated/schema';
import {Admin, TokenVoting} from '../../generated/templates';

import {ADDRESS_ZERO} from '../utils/constants';

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
