import {
  DaoPackage,
  ERC20VotingPackage,
  WhitelistPackage
} from '../../generated/schema';
import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  DataSourceContext,
  ethereum,
  log,
  store
} from '@graphprotocol/graph-ts';
import {ERC20Voting as ERC20VotingContract} from '../../generated/templates/ERC20Voting/ERC20Voting';
import {ERC20Voting, WhitelistVoting} from '../../generated/templates';
import {handleERC20Token} from '../utils/tokens';
import {ADDRESS_ZERO} from '../utils/constants';
import {WhitelistVoting as WhitelistVotingContract} from '../../generated/templates/WhitelistVoting/WhitelistVoting';

class WithdrawParams {
  token: Address = Address.fromString(ADDRESS_ZERO);
  to: Address = Address.fromString(ADDRESS_ZERO);
  amount: BigInt = BigInt.zero();
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

function createErc20VotingPakcage(who: Address, daoId: string): void {
  let packageEntity = ERC20VotingPackage.load(who.toHexString());
  if (!packageEntity) {
    packageEntity = new ERC20VotingPackage(who.toHexString());
    let contract = ERC20VotingContract.bind(who);
    let supportRequiredPct = contract.try_supportRequiredPct();
    let participationRequiredPct = contract.try_participationRequiredPct();
    let minDuration = contract.try_minDuration();
    let token = contract.try_token();

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

function createWhitelistVotingPakcage(who: Address, daoId: string): void {
  let packageEntity = WhitelistPackage.load(who.toHexString());
  if (!packageEntity) {
    packageEntity = new WhitelistPackage(who.toHexString());
    let contract = WhitelistVotingContract.bind(who);
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
    WhitelistVoting.createWithContext(who, context);

    packageEntity.save();
  }
}

export function addPackage(daoId: string, who: Address): void {
  let daoPackageEntityId = daoId + '_' + who.toHexString();
  let daoPackageEntity = new DaoPackage(daoPackageEntityId);
  daoPackageEntity.pkg = who.toHexString();
  daoPackageEntity.dao = daoId;
  daoPackageEntity.save();

  // package
  // @dev this is a temporary solution as we have only 2 packages, and should change in the future.
  let contract = WhitelistVotingContract.bind(who);
  let response = contract.try_whitelisted(Address.fromString(ADDRESS_ZERO));
  if (!response.reverted) {
    createWhitelistVotingPakcage(who, daoId);
    return;
  }
  createErc20VotingPakcage(who, daoId);
}

export function removePackage(daoId: string, who: string): void {
  let daoPackageEntityId = daoId + '_' + who;
  let daoPackageEntity = DaoPackage.load(daoPackageEntityId);
  if (daoPackageEntity) {
    store.remove('DaoPackage', daoPackageEntityId);
  }
}
