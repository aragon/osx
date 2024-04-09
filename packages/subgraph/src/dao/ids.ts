import {
  generateEntityIdFromBigInt,
  generateEntityIdFromBytes,
} from '@aragon/osx-commons-subgraph';
import {Address, BigInt, Bytes} from '@graphprotocol/graph-ts';

/**
 * TODO move to osx-commons
 * @param caller - The address (plugin or otherwise) that called `execute`
 * @param daoAddress - The address of the DAO in which the actions were executed
 * @param callId - The bytes32 ID of the call, passed by the caller - should be unique but not guaranteed
 * @returns A string representing a deterministic identifier for the transaction action entity.
 * This should be unique but due to callId being passed by the user, it is not guaranteed.
 * Clients can use this ID to filter to specific executions, but should check for duplicates.
 */
export function generateTransactionActionsDeterministicId(
  caller: Address,
  daoAddress: Address,
  callId: Bytes
): string {
  return [
    caller.toHexString(),
    daoAddress.toHexString(),
    callId.toHexString(),
  ].join('_');
}

/**
 * TODO move to osx-commons to replace the TransactionActionsProposalEntityId
 * @param caller - The address (plugin or otherwise) that called `execute`
 * @param daoAddress - The address of the DAO in which the actions were executed
 * @param callId - The ID of the call, passed by the caller - should be unique but not guaranteed
 * @param txHash - The hash of the transaction.
 * @param transactionLogIndex - The index of the log within the transaction.
 * We don't need the logIndex because the Tx hash is unique enough.
 * @returns A string representing the unique identifier for the transaction action entity.
 * This will be globally unique to avoid data loss but cannot be known ahead of execution due
 * to inclusion of Tx data.
 */
export function generateTransactionActionsEntityId(
  caller: Address,
  daoAddress: Address,
  callId: Bytes,
  txHash: Bytes,
  transactionLogIndex: BigInt
): string {
  return [
    generateTransactionActionsDeterministicId(caller, daoAddress, callId),
    generateEntityIdFromBytes(txHash),
    generateEntityIdFromBigInt(transactionLogIndex),
  ].join('_');
}

/**
 * TODO move to osx-commons
 * @param caller - The address (plugin or otherwise) that called `execute`
 * @param daoAddress - The address of the DAO in which the actions were executed
 * @param callId - The bytes32 ID of the call, passed by the caller - should be unique but not guaranteed
 * @param actionIndex - The index of the action within the call
 * @returns A string representing a deterministic identifier for the action entity.
 * This should be unique but due to callId being passed by the user, it is not guaranteed.
 * Clients can use this ID to filter to specific executions, but should check for duplicates.
 */
export function generateDeterministicActionId(
  caller: Address,
  daoAddress: Address,
  callId: Bytes,
  actionIndex: i32
): string {
  return [
    caller.toHexString(),
    daoAddress.toHexString(),
    callId.toHexString(),
    actionIndex.toString(),
  ].join('_');
}

/**
 * TODO decide whether to move to OSX commons
 * @param caller - The address (plugin or otherwise) that called `execute`
 * @param daoAddress - The address of the DAO in which the actions were executed
 * @param callId - The bytes32 ID of the call, passed by the caller - should be unique but not guaranteed
 * @param actionIndex - The index of the action within the call
 * @param txHash - The hash of the transaction.
 * @param transactionLogIndex - The index of the log within the transaction.
 * We don't need the logIndex because the Tx hash is unique enough.
 * @returns A string representing the unique identifier for the  action entity.
 * This will be globally unique to avoid data loss but cannot be known ahead of execution due
 * to inclusion of Tx data.
 */
export function generateTransactionActionEntityId(
  caller: Address,
  daoAddress: Address,
  callId: Bytes,
  actionIndex: i32,
  txHash: Bytes,
  transactionLogIndex: BigInt
): string {
  return [
    generateDeterministicActionId(caller, daoAddress, callId, actionIndex),
    txHash.toHexString(),
    transactionLogIndex.toString(),
  ].join('_');
}
