import {TokenVotingMember} from '../../../generated/schema';
import {GovernanceERC20 as GovernanceERC20Contract} from '../../../generated/templates/GovernanceERC20/GovernanceERC20';
import {ADDRESS_ZERO} from '../../utils/constants';
import {generateMemberEntityId} from '../../utils/ids';
import {Address, BigInt} from '@graphprotocol/graph-ts';

export function getERC20Balance(user: Address, tokenAddress: Address): BigInt {
  let contract = GovernanceERC20Contract.bind(tokenAddress);
  let balance = contract.balanceOf(user);
  return balance;
}

export function getDelegation(
  user: Address,
  tokenAddress: Address
): string | null {
  let contract = GovernanceERC20Contract.bind(tokenAddress);
  let delegate = contract.delegates(user);

  return delegate === Address.fromString(ADDRESS_ZERO)
    ? null
    : delegate.toHexString();
}

export function getDelegateeId(
  user: Address,
  tokenAddress: Address,
  pluginId: string
): string | null {
  let delegatee = getDelegation(user, tokenAddress);
  return delegatee
    ? generateMemberEntityId(
        Address.fromString(pluginId),
        Address.fromString(user.toHexString())
      )
    : null;
}

export function getVotingPower(user: Address, tokenAddress: Address): BigInt {
  let contract = GovernanceERC20Contract.bind(tokenAddress);
  let votingPower = contract.getVotes(user);
  return votingPower;
}

/**
 * A container for the result of the `getOrCreateMember` function.
 * @param entity - The `TokenVotingMember` entity.
 * @param createdNew - A boolean indicating whether the entity was created new
 * or if false it was previously created. If the entity was created new, it already
 * has the latest balance of the user, so no need to then update the balance.
 */
export class TokenVotingMemberResult {
  entity: TokenVotingMember;
  createdNew: boolean;

  constructor(entity: TokenVotingMember, createNew: boolean) {
    this.entity = entity;
    this.createdNew = createNew;
  }
}
