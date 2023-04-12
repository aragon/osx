import {ethereum, Bytes, Address, BigInt} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as/assembly/index';
import {Dao} from '../../generated/schema';

import {
  MetadataSet,
  NativeTokenDeposited,
  Deposited,
  Granted,
  Revoked,
  Executed,
  TrustedForwarderSet,
  SignatureValidatorSet,
  StandardCallbackRegistered,
  CallbackReceived
} from '../../generated/templates/DaoTemplateV1_0_0/DAO';

// events

export function createNewMetadataSetEvent(
  metadata: string,
  contractAddress: string
): MetadataSet {
  let newMetadataSetEvent = changetype<MetadataSet>(newMockEvent());

  newMetadataSetEvent.address = Address.fromString(contractAddress);
  newMetadataSetEvent.parameters = [];

  let metadataParam = new ethereum.EventParam(
    'metadata',
    ethereum.Value.fromBytes(Bytes.fromUTF8(metadata))
  );

  newMetadataSetEvent.parameters.push(metadataParam);

  return newMetadataSetEvent;
}

export function createCallbackReceivedEvent(
  dao: string,
  functionSig: Bytes,
  sender: string,
  data: Bytes
): CallbackReceived {
  let callBackEvent = changetype<CallbackReceived>(newMockEvent());

  callBackEvent.address = Address.fromString(dao);
  callBackEvent.parameters = [];

  let senderParam = new ethereum.EventParam(
    'sender',
    ethereum.Value.fromAddress(Address.fromString(sender))
  );
  let sigParam = new ethereum.EventParam(
    'sig',
    ethereum.Value.fromBytes(functionSig)
  );
  let dataParam = new ethereum.EventParam(
    'data',
    ethereum.Value.fromBytes(data)
  );

  callBackEvent.parameters.push(senderParam);
  callBackEvent.parameters.push(sigParam);
  callBackEvent.parameters.push(dataParam);

  return callBackEvent;
}

export function createTrustedForwarderSetEvent(
  trustedForwarder: string,
  contractAddress: string
): TrustedForwarderSet {
  let newTrustedForwarderSetEvent = changetype<TrustedForwarderSet>(
    newMockEvent()
  );

  newTrustedForwarderSetEvent.address = Address.fromString(contractAddress);
  newTrustedForwarderSetEvent.parameters = [];

  let trustedForwarderParam = new ethereum.EventParam(
    'trustedForwarder',
    ethereum.Value.fromAddress(Address.fromString(trustedForwarder))
  );

  newTrustedForwarderSetEvent.parameters.push(trustedForwarderParam);

  return newTrustedForwarderSetEvent;
}

export function createSignatureValidatorSetEvent(
  signatureValidator: string,
  contractAddress: string
): SignatureValidatorSet {
  let newSignatureValidatorSetEvent = changetype<SignatureValidatorSet>(
    newMockEvent()
  );

  newSignatureValidatorSetEvent.address = Address.fromString(contractAddress);
  newSignatureValidatorSetEvent.parameters = [];

  let trustedForwarderParam = new ethereum.EventParam(
    'signatureValidator',
    ethereum.Value.fromAddress(Address.fromString(signatureValidator))
  );

  newSignatureValidatorSetEvent.parameters.push(trustedForwarderParam);

  return newSignatureValidatorSetEvent;
}

export function createNewNativeTokenDepositedEvent(
  sender: string,
  amount: string,
  contractAddress: string
): NativeTokenDeposited {
  let newEvent = changetype<NativeTokenDeposited>(newMockEvent());

  newEvent.address = Address.fromString(contractAddress);
  newEvent.parameters = [];

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
  newEvent.parameters = [];

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

export function createNewGrantedEvent(
  contractPermissionId: Bytes,
  actor: string,
  where: string,
  who: string,
  condition: string,
  contractAddress: string
): Granted {
  let newGrantedEvent = changetype<Granted>(newMockEvent());

  newGrantedEvent.address = Address.fromString(contractAddress);
  newGrantedEvent.parameters = [];

  let contractPermissionIdParam = new ethereum.EventParam(
    'contractPermissionId',
    ethereum.Value.fromBytes(contractPermissionId)
  );
  let actorParam = new ethereum.EventParam(
    'actor',
    ethereum.Value.fromAddress(Address.fromString(actor))
  );
  let whereParam = new ethereum.EventParam(
    'where',
    ethereum.Value.fromAddress(Address.fromString(where))
  );
  let whoParam = new ethereum.EventParam(
    'who',
    ethereum.Value.fromAddress(Address.fromString(who))
  );
  let conditionParam = new ethereum.EventParam(
    'condition',
    ethereum.Value.fromAddress(Address.fromString(condition))
  );

  newGrantedEvent.parameters.push(contractPermissionIdParam);
  newGrantedEvent.parameters.push(actorParam);
  newGrantedEvent.parameters.push(whereParam);
  newGrantedEvent.parameters.push(whoParam);
  newGrantedEvent.parameters.push(conditionParam);

  return newGrantedEvent;
}

export function createNewRevokedEvent(
  contractPermissionId: Bytes,
  actor: string,
  where: string,
  who: string,
  contractAddress: string
): Revoked {
  let newGrantedEvent = changetype<Revoked>(newMockEvent());

  newGrantedEvent.address = Address.fromString(contractAddress);
  newGrantedEvent.parameters = [];

  let contractPermissionIdParam = new ethereum.EventParam(
    'contractPermissionId',
    ethereum.Value.fromBytes(contractPermissionId)
  );
  let actorParam = new ethereum.EventParam(
    'actor',
    ethereum.Value.fromAddress(Address.fromString(actor))
  );
  let whereParam = new ethereum.EventParam(
    'where',
    ethereum.Value.fromAddress(Address.fromString(where))
  );
  let whoParam = new ethereum.EventParam(
    'who',
    ethereum.Value.fromAddress(Address.fromString(who))
  );

  newGrantedEvent.parameters.push(contractPermissionIdParam);
  newGrantedEvent.parameters.push(actorParam);
  newGrantedEvent.parameters.push(whereParam);
  newGrantedEvent.parameters.push(whoParam);

  return newGrantedEvent;
}

export function createNewExecutedEvent<T extends Executed>(
  actor: string,
  callId: string,
  actions: ethereum.Tuple[],
  failureMap: BigInt,
  execResults: Bytes[],
  contractAddress: string,
  allowFailureMap: BigInt | null // used from DAO V1.2 and higher
): T {
  let newExecutedEvent = changetype<T>(newMockEvent());

  newExecutedEvent.address = Address.fromString(contractAddress);
  newExecutedEvent.parameters = [];

  let actorParam = new ethereum.EventParam(
    'actor',
    ethereum.Value.fromAddress(Address.fromString(actor))
  );
  let callIdParam = new ethereum.EventParam(
    'callId',
    ethereum.Value.fromBytes(Bytes.fromHexString(callId))
  );
  let actionsParam = new ethereum.EventParam(
    'actions',
    ethereum.Value.fromTupleArray(actions)
  );

  let allowFailureMapParam: ethereum.EventParam | null = null;
  if (allowFailureMap) {
    allowFailureMapParam = new ethereum.EventParam(
      'allowFailureMap',
      ethereum.Value.fromUnsignedBigInt(allowFailureMap)
    );
  }

  let failureMapParam = new ethereum.EventParam(
    'failureMap',
    ethereum.Value.fromUnsignedBigInt(failureMap)
  );

  let execResultsParams = new ethereum.EventParam(
    'execResults',
    ethereum.Value.fromBytesArray(execResults)
  );

  newExecutedEvent.parameters.push(actorParam);
  newExecutedEvent.parameters.push(callIdParam);
  newExecutedEvent.parameters.push(actionsParam);

  if (allowFailureMapParam) {
    newExecutedEvent.parameters.push(allowFailureMapParam);
  }

  newExecutedEvent.parameters.push(failureMapParam);
  newExecutedEvent.parameters.push(execResultsParams);

  return newExecutedEvent;
}

export function createStandardCallbackRegisteredEvent(
  interfaceId: string,
  callbackSelector: string,
  magicNumber: string,
  contractAddress: string
): StandardCallbackRegistered {
  let newStandardCallbackEvent = changetype<StandardCallbackRegistered>(
    newMockEvent()
  );

  newStandardCallbackEvent.address = Address.fromString(contractAddress);
  newStandardCallbackEvent.parameters = [];

  let interfaceIdParam = new ethereum.EventParam(
    'interfaceId',
    ethereum.Value.fromFixedBytes(Bytes.fromHexString(interfaceId) as Bytes)
  );

  let callbackSelectorParam = new ethereum.EventParam(
    'callbackSelector',
    ethereum.Value.fromFixedBytes(
      Bytes.fromHexString(callbackSelector) as Bytes
    )
  );

  let magicNumberParam = new ethereum.EventParam(
    'magicNumber',
    ethereum.Value.fromFixedBytes(Bytes.fromHexString(magicNumber) as Bytes)
  );

  newStandardCallbackEvent.parameters.push(interfaceIdParam);
  newStandardCallbackEvent.parameters.push(callbackSelectorParam);
  newStandardCallbackEvent.parameters.push(magicNumberParam);

  return newStandardCallbackEvent;
}

// calls

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

export function getEXECUTE_PERMISSION_ID(
  contractAddress: string,
  returns: Bytes
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'EXECUTE_PERMISSION_ID',
    'EXECUTE_PERMISSION_ID():(bytes32)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromBytes(returns)]);
}

export function getEXECUTE_PERMISSION_IDreverted(
  contractAddress: string
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'EXECUTE_PERMISSION_ID',
    'EXECUTE_PERMISSION_ID():(bytes32)'
  )
    .withArgs([])
    .reverts();
}

export function getSupportThreshold(
  contractAddress: string,
  returns: BigInt
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'supportThreshold',
    'supportThreshold():(uint32)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromSignedBigInt(returns)]);
}

export function getMinimalParticipation(
  contractAddress: string,
  returns: BigInt
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'minParticipation',
    'minParticipation():(uint32)'
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

export function getProposalCount(
  contractAddress: string,
  returns: BigInt
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'proposalCount',
    'proposalCount():(uint256)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromSignedBigInt(returns)]);
}

export function getVotingToken(contractAddress: string, returns: string): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'getVotingToken',
    'getVotingToken():(address)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromAddress(Address.fromString(returns))]);
}

export function getIsUserAllowed(
  contractAddress: string,
  address: string,
  returns: boolean
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'isListed',
    'isListedAtBlock(address,uint256):(bool)'
  )
    .withArgs([
      ethereum.Value.fromAddress(Address.fromString(address)),
      ethereum.Value.fromUnsignedBigInt(BigInt.zero())
    ])
    .returns([ethereum.Value.fromBoolean(returns)]);
}

export function getAllowedLength(
  contractAddress: string,
  returns: string
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'allowedLength',
    'allowedLength():(uint64)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromString(returns))]);
}

export function getSupportsInterface(
  contractAddress: string,
  interfaceId: string,
  returns: boolean
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'supportsInterface',
    'supportsInterface(bytes4):(bool)'
  )
    .withArgs([
      ethereum.Value.fromFixedBytes(Bytes.fromHexString(interfaceId) as Bytes)
    ])
    .returns([ethereum.Value.fromBoolean(returns)]);
}

// state

export function createDaoEntityState(
  entityID: string,
  creator: string,
  token: string
): Dao {
  let daoEntity = new Dao(entityID);
  daoEntity.creator = Address.fromString(creator);
  daoEntity.createdAt = BigInt.zero();
  daoEntity.token = Address.fromString(token).toHexString();
  daoEntity.save();

  return daoEntity;
}

export function encodeWithFunctionSelector(
  tuple: Array<ethereum.Value>,
  funcSelector: string,
  isDynamic: boolean = false
): Bytes {
  // ethereum.decode inside subgraph doesn't append 0x00...20 while the actual event
  // thrown from the real network includes this appended offset. Due to this, mappings contain
  // extra logic(appending the offset to the actual calldata in order to do ethereum.decode).
  // Due to this, from the tests, we need to append it as well. Note that this rule only applies
  // when the emitted event contains at least 1 dynamic type.
  let index = isDynamic == true ? 66 : 2;

  let calldata = ethereum
    .encode(ethereum.Value.fromTuple(changetype<ethereum.Tuple>(tuple)))!
    .toHexString()
    .substring(index);

  let functionData = funcSelector.concat(calldata);

  return Bytes.fromHexString(functionData);
}
