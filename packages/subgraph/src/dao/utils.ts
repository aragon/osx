import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  DataSourceContext,
  ethereum,
  store
} from '@graphprotocol/graph-ts';

import {ERC20Voting as ERC20VotingContract} from '../../generated/templates/ERC20Voting/ERC20Voting';
import {AllowlistVoting as AllowlistVotingContract} from '../../generated/templates/AllowlistVoting/AllowlistVoting';
import {ERC165 as ERC165Contract} from '../../generated/templates/DaoTemplate/ERC165';
import {ERC20Voting, AllowlistVoting} from '../../generated/templates';
import {
  DaoPackage,
  ERC20VotingPackage,
  AllowlistPackage
} from '../../generated/schema';
import {handleERC20Token} from '../utils/tokens';
import {
  ADDRESS_ZERO,
  ERC20_VOTING_INTERFACE,
  WHITELIST_VOTING_INTERFACE
} from '../utils/constants';
import {supportsInterface} from '../utils/erc165';

class WithdrawParams {
  token: Address = Address.fromString(ADDRESS_ZERO);
  to: Address = Address.fromString(ADDRESS_ZERO);
  amount: BigInt = BigInt.zero();
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  reference: string = '';
}

/**
 *
 * @param data is ethereum function call data without the function signiture for dao's Withdraw function
 * @returns WithdrawParams
 */
export function decodeWithdrawParams(data: ByteArray): WithdrawParams {
  let tokenSubArray = data.subarray(12, 32);
  let toSubArray = data.subarray(44, 64);
  let amountSubArray = data.subarray(64, 96);
  // skip next 32 Bytes as it is just an indicator that the next batch is string
  let referenceLengthSubArray = data.subarray(128, 160);
  let referenceSubArray = data.subarray(160);

  let tokenAddress = Address.fromString(
    Address.fromUint8Array(tokenSubArray).toHexString()
  );

  let toAddress = Address.fromString(
    Address.fromUint8Array(toSubArray).toHexString()
  );

  let amountDecoded = ethereum.decode(
    'uint256',
    changetype<Bytes>(amountSubArray)
  );
  let amountBigInt = BigInt.zero();
  if (amountDecoded) {
    amountBigInt = amountDecoded.toBigInt();
  }

  let referenceLengthDecoded = ethereum.decode(
    'uint256',
    changetype<Bytes>(referenceLengthSubArray)
  );
  let referenceLength: i32 = 0;
  if (referenceLengthDecoded) {
    referenceLength = referenceLengthDecoded.toI32();
  }

  // @dev perhaps a length limmit is need such as no more than 288 char
  let refrenceStringArray = referenceSubArray.subarray(0, referenceLength);
  let referenceBytes = Bytes.fromByteArray(
    changetype<ByteArray>(refrenceStringArray)
  );
  let withdrawParams = new WithdrawParams();
  withdrawParams.token = tokenAddress;
  withdrawParams.to = toAddress;
  withdrawParams.amount = amountBigInt;
  withdrawParams.reference = referenceBytes.toString();
  return withdrawParams;
}

function createErc20VotingPackage(who: Address, daoId: string): void {
  let packageEntity = ERC20VotingPackage.load(who.toHexString());
  if (!packageEntity) {
    packageEntity = new ERC20VotingPackage(who.toHexString());
    let contract = ERC20VotingContract.bind(who);
    let supportRequiredPct = contract.try_supportRequiredPct();
    let participationRequiredPct = contract.try_participationRequiredPct();
    let minDuration = contract.try_minDuration();
    let token = contract.try_getVotingToken();

    packageEntity.supportRequiredPct = supportRequiredPct.reverted
      ? null
      : supportRequiredPct.value;
    packageEntity.participationRequiredPct = participationRequiredPct.reverted
      ? null
      : participationRequiredPct.value;
    packageEntity.minDuration = minDuration.reverted ? null : minDuration.value;

    let tokenId = handleERC20Token(token.value);

    packageEntity.token = token.reverted ? null : tokenId;

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    ERC20Voting.createWithContext(who, context);

    packageEntity.save();
  }
}

function createAllowlistVotingPackage(who: Address, daoId: string): void {
  let packageEntity = AllowlistPackage.load(who.toHexString());
  if (!packageEntity) {
    packageEntity = new AllowlistPackage(who.toHexString());
    let contract = AllowlistVotingContract.bind(who);
    let supportRequiredPct = contract.try_supportRequiredPct();
    let participationRequiredPct = contract.try_participationRequiredPct();
    let minDuration = contract.try_minDuration();

    packageEntity.supportRequiredPct = supportRequiredPct.reverted
      ? null
      : supportRequiredPct.value;
    packageEntity.participationRequiredPct = participationRequiredPct.reverted
      ? null
      : participationRequiredPct.value;
    packageEntity.minDuration = minDuration.reverted ? null : minDuration.value;

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    AllowlistVoting.createWithContext(who, context);

    packageEntity.save();
  }
}

export function addPackage(daoId: string, who: Address): void {
  // package
  // TODO: rethink this once the market place is ready
  let contract = ERC165Contract.bind(who);

  let ERC20VotingInterfaceSuppoted = supportsInterface(
    contract,
    ERC20_VOTING_INTERFACE
  );
  let whiteListInterfaceSuppoted = supportsInterface(
    contract,
    WHITELIST_VOTING_INTERFACE
  );

  if (ERC20VotingInterfaceSuppoted) {
    createErc20VotingPackage(who, daoId);
  } else if (whiteListInterfaceSuppoted) {
    createAllowlistVotingPackage(who, daoId);
  }

  if (ERC20VotingInterfaceSuppoted || whiteListInterfaceSuppoted) {
    let daoPackageEntityId = daoId + '_' + who.toHexString();
    let daoPackageEntity = new DaoPackage(daoPackageEntityId);
    daoPackageEntity.pkg = who.toHexString();
    daoPackageEntity.dao = daoId;
    daoPackageEntity.save();
  }
}

export function removePackage(daoId: string, who: string): void {
  let daoPackageEntityId = daoId + '_' + who;
  let daoPackageEntity = DaoPackage.load(daoPackageEntityId);
  if (daoPackageEntity) {
    store.remove('DaoPackage', daoPackageEntityId);
  }
}
