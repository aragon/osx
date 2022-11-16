import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  ethereum
} from '@graphprotocol/graph-ts';

import {ADDRESS_ZERO} from '../utils/constants';

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
