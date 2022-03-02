import {
  ethereum,
  Bytes,
  Address,
  BigInt,
  ByteArray
} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as/assembly/index';
import {
  SetMetadata,
  ETHDeposited,
  Deposited,
  Withdrawn,
  Granted,
  Revoked,
  Frozen,
  Executed
} from '../../generated/templates/DaoTemplate/DAO';

export function createNewSetMetadataEvent(
  metadata: string,
  contractAddress: string
): SetMetadata {
  let newSetMetadataEvent = changetype<SetMetadata>(newMockEvent());

  newSetMetadataEvent.address = Address.fromString(contractAddress);
  newSetMetadataEvent.parameters = new Array();

  let metadataParam = new ethereum.EventParam(
    'metadata',
    ethereum.Value.fromBytes(Bytes.fromUTF8(metadata))
  );

  newSetMetadataEvent.parameters.push(metadataParam);

  return newSetMetadataEvent;
}

export function createNewETHDepositedEvent(
  sender: string,
  amount: string,
  contractAddress: string
): ETHDeposited {
  let newEvent = changetype<ETHDeposited>(newMockEvent());

  newEvent.address = Address.fromString(contractAddress);
  newEvent.parameters = new Array();

  let senderParam = new ethereum.EventParam(
    'sender',
    ethereum.Value.fromAddress(Address.fromString(sender))
  );
  let amountParam = new ethereum.EventParam(
    'amount',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(amount))
  );

  newEvent.parameters.push(senderParam);
  newEvent.parameters.push(amountParam);

  return newEvent;
}

export function createNewDepositedEvent(
  sender: string,
  token: string,
  amount: string,
  reference: string,
  contractAddress: string
): Deposited {
  let newEvent = changetype<Deposited>(newMockEvent());

  newEvent.address = Address.fromString(contractAddress);
  newEvent.parameters = new Array();

  let senderParam = new ethereum.EventParam(
    'sender',
    ethereum.Value.fromAddress(Address.fromString(sender))
  );
  let tokenParam = new ethereum.EventParam(
    'token',
    ethereum.Value.fromAddress(Address.fromString(token))
  );
  let amountParam = new ethereum.EventParam(
    'amount',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(amount))
  );
  let referenceParam = new ethereum.EventParam(
    '_reference',
    ethereum.Value.fromString(reference)
  );

  newEvent.parameters.push(senderParam);
  newEvent.parameters.push(tokenParam);
  newEvent.parameters.push(amountParam);
  newEvent.parameters.push(referenceParam);

  return newEvent;
}

export function getBalanceOf(
  contractAddress: string,
  account: string,
  returns: string
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'balanceOf',
    'balanceOf(address):(uint256)'
  )
    .withArgs([ethereum.Value.fromAddress(Address.fromString(account))])
    .returns([ethereum.Value.fromSignedBigInt(BigInt.fromString(returns))]);
}

export function createNewGrantedEvent(
  role: Bytes,
  actor: string,
  who: string,
  where: string,
  oracle: string,
  contractAddress: string
): Granted {
  let newGrantedEvent = changetype<Granted>(newMockEvent());

  newGrantedEvent.address = Address.fromString(contractAddress);
  newGrantedEvent.parameters = new Array();

  let roleParam = new ethereum.EventParam(
    'role',
    ethereum.Value.fromBytes(role)
  );
  let actorParam = new ethereum.EventParam(
    'actor',
    ethereum.Value.fromAddress(Address.fromString(actor))
  );
  let whoParam = new ethereum.EventParam(
    'who',
    ethereum.Value.fromAddress(Address.fromString(who))
  );
  let whereParam = new ethereum.EventParam(
    'where',
    ethereum.Value.fromAddress(Address.fromString(where))
  );
  let oracleParam = new ethereum.EventParam(
    'oracle',
    ethereum.Value.fromAddress(Address.fromString(oracle))
  );

  newGrantedEvent.parameters.push(roleParam);
  newGrantedEvent.parameters.push(actorParam);
  newGrantedEvent.parameters.push(whoParam);
  newGrantedEvent.parameters.push(whereParam);
  newGrantedEvent.parameters.push(oracleParam);

  return newGrantedEvent;
}

export function createNewRevokedEvent(
  role: Bytes,
  actor: string,
  who: string,
  where: string,
  contractAddress: string
): Revoked {
  let newGrantedEvent = changetype<Revoked>(newMockEvent());

  newGrantedEvent.address = Address.fromString(contractAddress);
  newGrantedEvent.parameters = new Array();

  let roleParam = new ethereum.EventParam(
    'role',
    ethereum.Value.fromBytes(role)
  );
  let actorParam = new ethereum.EventParam(
    'actor',
    ethereum.Value.fromAddress(Address.fromString(actor))
  );
  let whoParam = new ethereum.EventParam(
    'who',
    ethereum.Value.fromAddress(Address.fromString(who))
  );
  let whereParam = new ethereum.EventParam(
    'where',
    ethereum.Value.fromAddress(Address.fromString(where))
  );

  newGrantedEvent.parameters.push(roleParam);
  newGrantedEvent.parameters.push(actorParam);
  newGrantedEvent.parameters.push(whoParam);
  newGrantedEvent.parameters.push(whereParam);

  return newGrantedEvent;
}

export function createNewFrozenEvent(
  role: Bytes,
  actor: string,
  where: string,
  contractAddress: string
): Frozen {
  let newFrozenEvent = changetype<Frozen>(newMockEvent());

  newFrozenEvent.address = Address.fromString(contractAddress);
  newFrozenEvent.parameters = new Array();

  let roleParam = new ethereum.EventParam(
    'role',
    ethereum.Value.fromBytes(role)
  );
  let actorParam = new ethereum.EventParam(
    'actor',
    ethereum.Value.fromAddress(Address.fromString(actor))
  );
  let whereParam = new ethereum.EventParam(
    'where',
    ethereum.Value.fromAddress(Address.fromString(where))
  );

  newFrozenEvent.parameters.push(roleParam);
  newFrozenEvent.parameters.push(actorParam);
  newFrozenEvent.parameters.push(whereParam);

  return newFrozenEvent;
}

export function getEXEC_ROLE(contractAddress: string, returns: Bytes): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'EXEC_ROLE',
    'EXEC_ROLE():(bytes32)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromBytes(returns)]);
}

export function getEXEC_ROLEreverted(contractAddress: string): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'EXEC_ROLE',
    'EXEC_ROLE():(bytes32)'
  )
    .withArgs([])
    .reverts();
}

export function getSupportRequiredPct(
  contractAddress: string,
  returns: BigInt
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'supportRequiredPct',
    'supportRequiredPct():(uint64)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromSignedBigInt(returns)]);
}

export function getParticipationRequiredPct(
  contractAddress: string,
  returns: BigInt
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'participationRequiredPct',
    'participationRequiredPct():(uint64)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromSignedBigInt(returns)]);
}

export function getMinDuration(contractAddress: string, returns: BigInt): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'minDuration',
    'minDuration():(uint64)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromSignedBigInt(returns)]);
}

export function getVotesLength(contractAddress: string, returns: BigInt): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'votesLength',
    'votesLength():(uint256)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromSignedBigInt(returns)]);
}

export function getSVToken(contractAddress: string, returns: string): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'token',
    'token():(address)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromAddress(Address.fromString(returns))]);
}

export function getWhiteListed(
  contractAddress: string,
  address: string,
  returns: boolean
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'whitelisted',
    'whitelisted(address):(bool)'
  )
    .withArgs([ethereum.Value.fromAddress(Address.fromString(address))])
    .returns([ethereum.Value.fromBoolean(returns)]);
}

export function getWhitelistedLength(
  contractAddress: string,
  returns: string
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'whitelistedLength',
    'whitelistedLength():(uint64)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromString(returns))]);
}

export function createNewExecutedEvent(
  actor: string,
  callId: string,
  actions: ethereum.Tuple[],
  execResults: Bytes[],
  contractAddress: string
): Executed {
  let newExecutedEvent = changetype<Executed>(newMockEvent());

  newExecutedEvent.address = Address.fromString(contractAddress);
  newExecutedEvent.parameters = new Array();

  let actorParam = new ethereum.EventParam(
    'actor',
    ethereum.Value.fromAddress(Address.fromString(actor))
  );
  let callIdParam = new ethereum.EventParam(
    'callId',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(callId))
  );
  let actionsParam = new ethereum.EventParam(
    'actions',
    ethereum.Value.fromTupleArray(actions)
  );
  let execResultsParams = new ethereum.EventParam(
    'execResults',
    ethereum.Value.fromBytesArray(execResults)
  );

  newExecutedEvent.parameters.push(actorParam);
  newExecutedEvent.parameters.push(callIdParam);
  newExecutedEvent.parameters.push(actionsParam);
  newExecutedEvent.parameters.push(execResultsParams);

  return newExecutedEvent;
}
