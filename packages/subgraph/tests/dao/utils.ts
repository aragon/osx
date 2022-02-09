import {
  ethereum,
  Bytes,
  Address,
  bigInt,
  BigInt,
  BigDecimal
} from '@graphprotocol/graph-ts';
import {newMockEvent} from 'matchstick-as/assembly/index';
import {
  SetMetadata,
  ETHDeposited,
  Deposited,
  Withdrawn
} from '../../generated/templates/DAO/DAO';

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

export function createNewWithdrawnEvent(
  token: string,
  to: string,
  amount: string,
  reference: string,
  contractAddress: string
): Withdrawn {
  let newEvent = changetype<Withdrawn>(newMockEvent());

  newEvent.address = Address.fromString(contractAddress);
  newEvent.parameters = new Array();

  let tokenParam = new ethereum.EventParam(
    'token',
    ethereum.Value.fromAddress(Address.fromString(token))
  );
  let toParam = new ethereum.EventParam(
    'to',
    ethereum.Value.fromAddress(Address.fromString(to))
  );
  let amountParam = new ethereum.EventParam(
    'amount',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(amount))
  );
  let referenceParam = new ethereum.EventParam(
    '_reference',
    ethereum.Value.fromString(reference)
  );

  newEvent.parameters.push(tokenParam);
  newEvent.parameters.push(toParam);
  newEvent.parameters.push(amountParam);
  newEvent.parameters.push(referenceParam);

  return newEvent;
}
