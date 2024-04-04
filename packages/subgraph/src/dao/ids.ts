import {
  generateEntityIdFromBigInt,
  generateEntityIdFromBytes,
} from '@aragon/osx-commons-subgraph';
import {BigInt, Bytes} from '@graphprotocol/graph-ts';

/**
 * TODO move to osx-commons
 * @param daoAddress - The address of the DAO in which the actions were executed
 * @param caller - The address (plugin or otherwise) that called `execute`
 * @param callId - The ID of the call, passed by the caller - should be unique but not guaranteed
 * @returns A string representing a deterministic identifier for the transaction action entity.
 * This should be unique but due to callId being passed by the user, it is not guaranteed.
 * Clients can use this ID to filter to specific executions, but should check for duplicates.
 */
export function generateTransactionActionsDeterministicId(
  daoAddress: string,
  caller: string,
  callId: string
): string {
  return [daoAddress, caller, callId].join('_');
}

/**
 * TODO move to osx-commons to replace the TransactionActionsProposalEntityId
 * @param daoAddress - The address of the DAO in which the actions were executed
 * @param caller - The address (plugin or otherwise) that called `execute`
 * @param callId - The ID of the call, passed by the caller - should be unique but not guaranteed
 * @param txHash - The hash of the transaction.
 * @param logIndex - The index of the log.
 * @returns A string representing the unique identifier for the transaction action entity.
 * This will be globally unique to avoid data loss but cannot be known ahead of execution due
 * to inclusion of Tx data.
 */
export function generateTransactionActionsEntityId(
  daoAddress: string,
  caller: string,
  callId: string,
  txHash: Bytes,
  logIndex: BigInt
): string {
  return [
    generateTransactionActionsDeterministicId(daoAddress, caller, callId),
    generateEntityIdFromBytes(txHash),
    generateEntityIdFromBigInt(logIndex),
  ].join('_');
}

/**
 * TODO move to osx-commons
 * @param daoAddress - The address of the DAO in which the actions were executed
 * @param caller - The address (plugin or otherwise) that called `execute`
 * @param callId - The ID of the call, passed by the caller - should be unique but not guaranteed
 * @param actionIndex - The index of the action within the call
 * @returns A string representing a deterministic identifier for the action entity.
 * This should be unique but due to callId being passed by the user, it is not guaranteed.
 * Clients can use this ID to filter to specific executions, but should check for duplicates.
 */
export function generateDeterministicActionId(
  daoAddress: string,
  caller: string,
  callId: string,
  actionIndex: i32
): string {
  return [daoAddress, caller, callId, actionIndex.toString()].join('_');
}

/**
 * TODO decide whether to move to OSX commons
 * @param daoAddress - The address of the DAO in which the actions were executed
 * @param caller - The address (plugin or otherwise) that called `execute`
 * @param callId - The ID of the call, passed by the caller - should be unique but not guaranteed
 * @param actionIndex - The index of the action within the call
 * @param txHash - The hash of the transaction.
 * @param logIndex - The index of the log.
 * @returns A string representing the unique identifier for the  action entity.
 * This will be globally unique to avoid data loss but cannot be known ahead of execution due
 * to inclusion of Tx data.
 */
export function generateActionEntityId(
  daoAddress: string,
  caller: string,
  callId: string,
  actionIndex: i32,
  txHash: Bytes,
  logIndex: BigInt
): string {
  return [
    generateDeterministicActionId(daoAddress, caller, callId, actionIndex),
    txHash.toHexString(),
    logIndex.toString(),
  ].join('_');
}
