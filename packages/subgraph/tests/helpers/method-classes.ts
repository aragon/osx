/**
 * IMPORTANT: Do not export classes from this file.
 * The classes of this file are meant to be incorporated into the classes of ./extended-schema.ts
 */
import {
  Dao,
  ERC20Balance,
  ERC20Contract,
  ERC20Transfer,
  ERC721Balance,
  ERC721Contract,
  ERC721Transfer,
  ERC1155Contract,
  ERC1155Transfer,
  ERC1155Balance,
  ERC1155TokenIdBalance,
  NativeBalance,
  NativeTransfer,
  Permission,
} from '../../generated/schema';
import {
  CallbackReceived,
  Deposited,
  NativeTokenDeposited,
  NewURI,
} from '../../generated/templates/DaoTemplateV1_0_0/DAO';
import {
  getBalanceId,
  getERC1155TransferId,
  getTokenIdBalanceId,
  getTransferId,
} from '../../src/utils/tokens/common';
import {
  ADDRESS_ONE,
  CONTRACT_ADDRESS,
  CREATED_AT,
  DAO_ADDRESS,
  DAO_TOKEN_ADDRESS,
  STRING_DATA,
  ADDRESS_TWO,
  ADDRESS_THREE,
  ADDRESS_ZERO,
  ADDRESS_FOUR,
  ACTION_BATCH_ID,
} from '../constants';
import {
  createCallbackReceivedEvent,
  createNewDepositedEvent,
  createNewNativeTokenDepositedEvent,
  createNewURIEvent,
  getBalanceOf,
  getSupportsInterface,
} from '../dao/utils';
import {
  createNewGrantedEvent,
  createNewRevokedEvent,
} from '../permission-manager/utils';
import {
  generatePermissionEntityId,
  createERC20TokenCalls,
  createERC1155TokenCalls,
  createTokenCalls,
} from '@aragon/osx-commons-subgraph';
import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  crypto,
} from '@graphprotocol/graph-ts';

/* eslint-disable  @typescript-eslint/no-unused-vars */
// PermissionManager
class PermissionMethods extends Permission {
  withDefaultValues(
    emittingContract: string = Address.fromString(
      CONTRACT_ADDRESS
    ).toHexString()
  ): PermissionMethods {
    const permissionId = Bytes.fromByteArray(
      crypto.keccak256(ByteArray.fromUTF8('EXECUTE_PERMISSION'))
    );

    const emittingContractAddress = Address.fromString(emittingContract);
    const whereAddress = Address.fromString(ADDRESS_ONE);
    const whoAddress = Address.fromString(ADDRESS_TWO);
    const actorAddress = Address.fromString(ADDRESS_THREE);
    const conditionAddress = Address.fromString(ADDRESS_FOUR);

    this.id = generatePermissionEntityId(
      emittingContractAddress,
      permissionId,
      whereAddress,
      whoAddress
    );
    this.where = whereAddress;
    this.permissionId = permissionId;
    this.who = whoAddress;
    this.actor = actorAddress;
    this.condition = conditionAddress;

    this.dao = null;
    this.pluginRepo = null;

    return this;
  }

  // events
  createEvent_Granted<T>(
    emittingContract: string = Address.fromString(
      CONTRACT_ADDRESS
    ).toHexString()
  ): T {
    if (this.condition === null) {
      throw new Error('Condition is null');
    }

    let event = createNewGrantedEvent<T>(
      this.permissionId,
      this.actor.toHexString(),
      this.where.toHexString(),
      this.who.toHexString(),
      (this.condition as Bytes).toHexString(),
      emittingContract
    );

    return event as T;
  }

  createEvent_Revoked<T>(
    emittingContract: string = Address.fromString(
      CONTRACT_ADDRESS
    ).toHexString()
  ): T {
    let event = createNewRevokedEvent<T>(
      this.permissionId,
      this.actor.toHexString(),
      this.where.toHexString(),
      this.who.toHexString(),
      emittingContract
    );

    return event as T;
  }
}

//  ERC1155Contract
class ERC1155ContractMethods extends ERC1155Contract {
  withDefaultValues(): ERC1155ContractMethods {
    this.id = Address.fromHexString(DAO_TOKEN_ADDRESS).toHexString();
    return this;
  }
  mockCall_createERC1155TokenCalls(): void {
    createERC1155TokenCalls(this.id, '0', 'https://example.org/0.json');
  }
}

class ERC1155BalanceMethods extends ERC1155Balance {
  withDefaultValues(): ERC1155BalanceMethods {
    let daoId = Address.fromString(DAO_ADDRESS).toHexString();
    let tokenId = Address.fromString(DAO_TOKEN_ADDRESS).toHexString();
    let balanceId = getBalanceId(daoId, tokenId);

    this.id = balanceId;
    this.token = tokenId;
    this.dao = daoId;
    this.metadataUri = 'https://example.org/{id}.json';
    this.lastUpdated = BigInt.zero();
    return this;
  }
}
class ERC1155TokenIdBalanceMethods extends ERC1155TokenIdBalance {
  withDefaultValues(): ERC1155TokenIdBalanceMethods {
    let daoId = Address.fromString(DAO_ADDRESS).toHexString();
    let tokenId = Address.fromString(DAO_TOKEN_ADDRESS).toHexString();
    let balanceId = getBalanceId(daoId, tokenId);

    this.id = getTokenIdBalanceId(daoId, tokenId, BigInt.zero());
    this.amount = BigInt.zero();
    this.balance = balanceId;
    this.tokenId = BigInt.zero();
    this.lastUpdated = BigInt.zero();
    return this;
  }
}

class ERC1155TransferMethods extends ERC1155Transfer {
  withDefaultValues(
    id: string = getERC1155TransferId(Bytes.empty(), BigInt.zero(), 0, 0)
  ): ERC1155TransferMethods {
    this.id = id;
    this.dao = DAO_ADDRESS;
    this.token = Address.fromString(DAO_TOKEN_ADDRESS).toHexString();
    this.tokenId = BigInt.zero();
    this.from = Address.fromHexString(ADDRESS_ONE);
    this.to = Address.fromHexString(DAO_ADDRESS);
    this.actionBatch = 'null';
    this.type = 'Deposit';
    this.txHash = Bytes.empty();
    this.createdAt = BigInt.fromString(CREATED_AT);

    return this;
  }
}

// ERC721Contract
class ERC721ContractMethods extends ERC721Contract {
  withDefaultValues(): ERC721ContractMethods {
    this.id = Address.fromHexString(DAO_TOKEN_ADDRESS).toHexString();
    this.name = 'name';
    this.symbol = 'symbol';
    return this;
  }

  // calls
  mockCall_createTokenCalls(): void {
    if (!this.name) {
      throw new Error('Name is null');
    }
    if (!this.symbol) {
      throw new Error('Symbol is null');
    }
    // we cast to string only for stopping rust compiler complaints.
    createTokenCalls(
      DAO_TOKEN_ADDRESS,
      this.name as string,
      this.symbol as string
    );
  }
}

// ERC721Balance
class ERC721BalanceMethods extends ERC721Balance {
  withDefaultValues(): ERC721BalanceMethods {
    let daoId = Address.fromString(DAO_ADDRESS).toHexString();
    let tokenId = Address.fromString(DAO_TOKEN_ADDRESS).toHexString();
    let balanceId = daoId.concat('_').concat(tokenId);

    this.id = balanceId;
    this.token = Address.fromHexString(DAO_TOKEN_ADDRESS).toHexString();
    this.dao = DAO_ADDRESS;
    this.tokenIds = [BigInt.zero()];
    this.lastUpdated = BigInt.zero();
    return this;
  }
}

// ERC721Transfer
class ERC721TransferMethods extends ERC721Transfer {
  withDefaultValues(
    id: string = getTransferId(Bytes.empty(), BigInt.zero(), 0)
  ): ERC721TransferMethods {
    this.id = id;
    this.dao = DAO_ADDRESS;
    this.token = Address.fromString(DAO_TOKEN_ADDRESS).toHexString();
    this.tokenId = BigInt.zero();
    this.from = Address.fromHexString(ADDRESS_ONE);
    this.to = Address.fromHexString(DAO_ADDRESS);
    this.actionBatch = ACTION_BATCH_ID;
    this.type = 'Deposit';
    this.txHash = Bytes.empty();
    this.createdAt = BigInt.fromString(CREATED_AT);
    return this;
  }
}

// ERC20Contract

class ERC20ContractMethods extends ERC20Contract {
  withDefaultValues(): ERC20ContractMethods {
    this.id = Address.fromHexString(DAO_TOKEN_ADDRESS).toHexString();
    this.name = 'DAO Token';
    this.symbol = 'DAOT';
    this.decimals = 6;

    return this;
  }

  // calls
  mockCall_createTokenCalls(totalSupply: string | null = null): void {
    if (!this.name) {
      throw new Error('Name is null');
    }
    if (!this.symbol) {
      throw new Error('Symbol is null');
    }
    let supply = '10';
    if (totalSupply) {
      supply = totalSupply;
    }
    // we cast to string only for stoping rust compiler complaints.
    createERC20TokenCalls(
      this.id,
      supply,
      this.name as string,
      this.symbol as string,
      this.decimals.toString()
    );
  }

  mockCall_supportsInterface(interfaceId: string, value: boolean): void {
    getSupportsInterface(this.id, interfaceId, value);
  }

  mockCall_balanceOf(account: string, amount: string): void {
    getBalanceOf(this.id, account, amount);
  }
}

// ERC20Balance
class ERC20BalanceMethods extends ERC20Balance {
  withDefaultValues(): ERC20BalanceMethods {
    let daoId = Address.fromString(DAO_ADDRESS).toHexString();
    let tokenId = Address.fromString(DAO_TOKEN_ADDRESS).toHexString();
    let balanceId = daoId.concat('_').concat(tokenId);

    this.id = balanceId;
    this.token = Address.fromHexString(DAO_TOKEN_ADDRESS).toHexString();
    this.dao = DAO_ADDRESS;
    this.balance = BigInt.zero();
    this.lastUpdated = BigInt.zero();
    return this;
  }
}

class ERC20TransferMethods extends ERC20Transfer {
  withDefaultValue(
    id: string = getTransferId(Bytes.empty(), BigInt.zero(), 0)
  ): ERC20TransferMethods {
    this.id = id;
    this.dao = DAO_ADDRESS;
    this.token = Address.fromString(DAO_TOKEN_ADDRESS).toHexString();
    this.amount = BigInt.zero();
    this.from = Address.fromHexString(ADDRESS_ONE);
    this.to = Address.fromHexString(DAO_ADDRESS);
    this.actionBatch = ACTION_BATCH_ID;
    this.type = 'Deposit';
    this.txHash = Bytes.empty();
    this.createdAt = BigInt.fromString(CREATED_AT);

    return this;
  }
}

// NativeTransfer
class NativeTransferMethods extends NativeTransfer {
  withDefaultValues(
    id: string = getTransferId(Bytes.empty(), BigInt.zero(), 0)
  ): NativeTransferMethods {
    this.id = id;
    this.dao = DAO_ADDRESS;
    this.amount = BigInt.zero();
    this.from = Address.fromHexString(ADDRESS_ONE);
    this.to = Address.fromHexString(DAO_ADDRESS);
    this.reference = 'Native Deposit';
    this.actionBatch = ACTION_BATCH_ID;
    this.type = 'Deposit';
    this.txHash = Bytes.empty();
    this.createdAt = BigInt.fromString(CREATED_AT);

    return this;
  }
}

// NativeBalance
class NativeBalanceMethods extends NativeBalance {
  withDefaultValues(): NativeBalanceMethods {
    this.id = DAO_ADDRESS.concat('_').concat(ADDRESS_ZERO);
    this.dao = DAO_ADDRESS;
    this.balance = BigInt.zero();
    this.lastUpdated = BigInt.zero();

    return this;
  }
}

// DAO
class DaoMethods extends Dao {
  withDefaultValues(): DaoMethods {
    this.id = DAO_ADDRESS;
    this.subdomain = '';
    this.creator = Address.fromHexString(ADDRESS_ONE);
    this.metadata = STRING_DATA;
    this.daoURI = STRING_DATA;
    this.createdAt = BigInt.fromString(CREATED_AT);
    this.token = Address.fromString(DAO_TOKEN_ADDRESS).toHexString();
    this.trustedForwarder = Address.fromHexString(ADDRESS_TWO);
    this.signatureValidator = Address.fromHexString(ADDRESS_THREE);
    return this;
  }

  // events
  createEvent_NativeTokenDeposited(
    senderAddress: string,
    amount: string
  ): NativeTokenDeposited {
    let event = createNewNativeTokenDepositedEvent(
      senderAddress,
      amount,
      this.id
    );

    return event;
  }

  createEvent_Deposited(
    senderAddress: string,
    amount: string,
    reference: string
  ): Deposited {
    if (!this.token) {
      throw new Error('Token is null');
    }

    // we cast to string only for stoping rust compiler complaints.
    let event = createNewDepositedEvent(
      senderAddress,
      this.token as string,
      amount,
      reference,
      this.id
    );

    return event;
  }

  createEvent_CallbackReceived(
    onERC721Received: string,
    functionData: Bytes
  ): CallbackReceived {
    if (!this.token) {
      throw new Error('Token is null');
    }

    // we cast to string only for stoping rust compiler complaints.
    let event = createCallbackReceivedEvent(
      this.id,
      Bytes.fromHexString(onERC721Received),
      this.token as string,
      functionData
    );

    return event;
  }

  createEvent_NewURI(newURI: string): NewURI {
    let event = createNewURIEvent(newURI, this.id);

    return event;
  }
}
