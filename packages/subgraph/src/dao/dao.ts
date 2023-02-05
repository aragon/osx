import {Address, Bytes, store, ethereum, log} from '@graphprotocol/graph-ts';

import {
  MetadataSet,
  Executed,
  Deposited,
  NativeTokenDeposited,
  Granted,
  Revoked,
  TrustedForwarderSet,
  SignatureValidatorSet,
  StandardCallbackRegistered,
  CallbackReceived
} from '../../generated/templates/DaoTemplate/DAO';
import {
  Dao,
  ContractPermissionId,
  Permission,
  // VaultTransfer,
  StandardCallback,
  ERC20Transfer,
  ERC721Transfer,
  ERC721Token,
  ERC721Balance
} from '../../generated/schema';
import {ERC721} from '../../generated/templates/DaoTemplate/ERC721';

import {ADDRESS_ZERO} from '../utils/constants';
import {handleERC20Token, updateBalance} from '../utils/tokens';
import {decodeWithdrawParams} from './utils';
import { supportsInterface } from '../utils/erc165';

export function handleMetadataSet(event: MetadataSet): void {
  let daoId = event.address.toHexString();
  let metadata = event.params.metadata.toString();
  _handleMetadataSet(daoId, metadata);
}

export function _handleMetadataSet(daoId: string, metadata: string): void {
  let entity = Dao.load(daoId);
  if (entity) {
    entity.metadata = metadata;
    entity.save();
  }
}

export function handleCallbackReceived(event: CallbackReceived): void {
  let functionSig = event.params.sig;
  let data = event.params.data;
  let sender = event.params.sender.toHexString();

  let erc721ReceivedSelector = '0x150b7a02'
  let erc1155ReceivedSelector = '0xf23a6e61'
  
  // Selector is onERC721Received
  if(functionSig.equals(Bytes.fromHexString(erc721ReceivedSelector))) {
    // Double check that it's ERC721 by calling supportsInterface checks.
    const erc721 = ERC721.bind(event.params.sender);
    let introspection_01ffc9a7 = supportsInterface(erc721, '01ffc9a7') // ERC165
		let introspection_80ac58cd = supportsInterface(erc721, '80ac58cd') // ERC721
		let introspection_00000000 = supportsInterface(erc721, '00000000', false)
		let isERC721 = introspection_01ffc9a7 && introspection_80ac58cd && introspection_00000000
    if(!isERC721) {
      return;
    }

    // encoded needs to start with `'0x0000000000000000000000000000000000000000000000000000000000000020'` 
    // when emitted realtime, but not from tests as it includes that already
    const encoded = "0x0000000000000000000000000000000000000000000000000000000000000020" + data.toHexString().slice(10);
    const decoded = ethereum.decode('(address,address,uint256,bytes)', Bytes.fromHexString(encoded));

    if(decoded) {
      log.debug("DECODED CORRECTLY {}", ["12345"])
      const from = decoded.toTuple()[0].toAddress();
      const tokenId = decoded.toTuple()[2].toBigInt();
      
      let transferId = event.address.toHexString() +
              '_' + event.transaction.hash.toHexString()
              '_' + event.transactionLogIndex.toHexString();

      let erc721TokenEntity = ERC721Token.load(sender)
      
      if(!erc721TokenEntity) {
        erc721TokenEntity = new ERC721Token(sender);
        {
          const token = ERC721.bind(event.params.sender);

          const name = token.try_name()
          const symbol = token.try_symbol()
          erc721TokenEntity.name = name.reverted ? '' : name.value
          erc721TokenEntity.symbol = symbol.reverted ? '' : symbol.value
          erc721TokenEntity.save()
        }
      }

      let entity = new ERC721Transfer(transferId);
      entity.from = from;
      entity.dao = event.address.toHexString()
      entity.to = event.address;
      entity.tokenId = tokenId;
      entity.type = 'Deposit'
      entity.token = sender;
      entity.save()

      let balanceId = event.address.toHexString() + "_" + sender
      let balanceEntity = ERC721Balance.load(balanceId)
      if(!balanceEntity) {
        balanceEntity = new ERC721Balance(balanceId)
        balanceEntity.dao = event.address.toHexString()
        balanceEntity.token = sender;
        let tokenIds = [tokenId];
        balanceEntity.tokenIds = tokenIds;
      } else {
        let tokenIds = balanceEntity.tokenIds
        tokenIds.push(tokenId)
        balanceEntity.tokenIds = tokenIds
      }
      balanceEntity.lastUpdated = event.block.timestamp;
      balanceEntity.save()
      // sender is the token TODO: call supportsInterface to make sure.
    } else {
      log.warning("gio {}222", ["ooo"]);
    }
  }
}

// ERC20 + ETH
export function handleDeposited(event: Deposited): void {
  let daoId = event.address.toHexString();
  let depositId =
    event.address.toHexString() +
    '_' +
    event.transaction.hash.toHexString() +
    '_' +
    event.transactionLogIndex.toHexString();
  let token = event.params.token;
  let balanceId = daoId + '_' + token.toHexString();

  // handle token
  let tokenId = handleERC20Token(token);
  // update balance
  updateBalance(
    balanceId,
    event.address,
    token,
    event.params.amount,
    true,
    event.block.timestamp
  );

  let entity = new ERC20Transfer(depositId);
  entity.dao = daoId;
  entity.token = tokenId;
  entity.from = event.params.sender;
  entity.to = event.address;
  entity.amount = event.params.amount;
  // entity.reference = event.params._reference;
  // entity.transaction = event.transaction.hash.toHexString();
  // entity.createdAt = event.block.timestamp;
  entity.type = 'Deposit';
  entity.save();
}

export function handleNativeTokenDeposited(event: NativeTokenDeposited): void {
  // let daoId = event.address.toHexString();
  // let id =
  //   event.address.toHexString() +
  //   '_' +
  //   event.transaction.hash.toHexString() +
  //   '_' +
  //   event.transactionLogIndex.toHexString();

  // let entity = new VaultTransfer(id);
  // let balanceId = daoId + '_' + ADDRESS_ZERO;

  // // handle token
  // let tokenId = handleERC20Token(Address.fromString(ADDRESS_ZERO));
  // // update Eth balance
  // updateBalance(
  //   balanceId,
  //   event.address,
  //   Address.fromString(ADDRESS_ZERO),
  //   event.params.amount,
  //   true,
  //   event.block.timestamp
  // );

  // entity.dao = daoId;
  // entity.token = tokenId;
  // entity.sender = event.params.sender;
  // entity.amount = event.params.amount;
  // entity.reference = 'Eth deposit';
  // entity.transaction = event.transaction.hash.toHexString();
  // entity.createdAt = event.block.timestamp;
  // entity.type = 'Deposit';
  // entity.save();
}

export function handleExecuted(event: Executed): void {
  // let daoId = event.address.toHexString();
  // let actions = event.params.actions;
  // for (let index = 0; index < actions.length; index++) {
  //   const action = actions[index];

  //   // check for withdraw
  //   let methodSig = action.data.toHexString().slice(0, 10);

  //   if (methodSig == '0x4f065632') {
  //     // then decode params
  //     let callParams = action.data.toHexString().slice(10);
  //     let withdrawParams = decodeWithdrawParams(
  //       Bytes.fromHexString('0x' + callParams)
  //     );

  //     // handle token
  //     let tokenId = handleERC20Token(withdrawParams.token);
  //     // update balance
  //     if (withdrawParams.token.toHexString() == ADDRESS_ZERO) {
  //       // update Eth balance
  //       let balanceId = daoId + '_' + ADDRESS_ZERO;
  //       updateBalance(
  //         balanceId,
  //         event.address,
  //         Address.fromString(ADDRESS_ZERO),
  //         withdrawParams.amount,
  //         false,
  //         event.block.timestamp
  //       );
  //     } else {
  //       // update token balance
  //       let balanceId = daoId + '_' + tokenId;
  //       updateBalance(
  //         balanceId,
  //         event.address,
  //         withdrawParams.token,
  //         withdrawParams.amount,
  //         false,
  //         event.block.timestamp
  //       );
  //     }

  //     let proposalId =
  //       event.params.actor.toHexString() +
  //       '_' +
  //       event.params.callId.toHexString();

  //     // create a withdraw entity
  //     let withdrawId =
  //       daoId +
  //       '_' +
  //       event.transaction.hash.toHexString() +
  //       '_' +
  //       event.transactionLogIndex.toHexString() +
  //       '_' +
  //       withdrawParams.to.toHexString() +
  //       '_' +
  //       withdrawParams.amount.toString() +
  //       '_' +
  //       tokenId +
  //       '_' +
  //       withdrawParams.reference;

  //     let vaultWithdrawEntity = new VaultTransfer(withdrawId);
  //     vaultWithdrawEntity.dao = daoId;
  //     vaultWithdrawEntity.token = tokenId;
  //     vaultWithdrawEntity.to = withdrawParams.to;
  //     vaultWithdrawEntity.amount = withdrawParams.amount;
  //     vaultWithdrawEntity.reference = withdrawParams.reference;
  //     vaultWithdrawEntity.proposal = proposalId;
  //     vaultWithdrawEntity.transaction = event.transaction.hash.toHexString();
  //     vaultWithdrawEntity.createdAt = event.block.timestamp;
  //     vaultWithdrawEntity.type = 'Withdraw';
  //     vaultWithdrawEntity.save();
  //   }
  // }
}

export function handleGranted(event: Granted): void {
  // ContractPermissionId
  let daoId = event.address.toHexString();
  let contractPermissionIdEntityId =
    event.params.where.toHexString() +
    '_' +
    event.params.permissionId.toHexString();
  let contractPermissionIdEntity = ContractPermissionId.load(
    contractPermissionIdEntityId
  );
  if (!contractPermissionIdEntity) {
    contractPermissionIdEntity = new ContractPermissionId(
      contractPermissionIdEntityId
    );
    contractPermissionIdEntity.dao = daoId;
    contractPermissionIdEntity.where = event.params.where;
    contractPermissionIdEntity.permissionId = event.params.permissionId;
    contractPermissionIdEntity.save();
  }

  // Permission
  let permissionId =
    contractPermissionIdEntityId + '_' + event.params.who.toHexString();
  let permissionEntity = new Permission(permissionId);
  permissionEntity.dao = daoId;
  permissionEntity.contractPermissionId = contractPermissionIdEntityId;
  permissionEntity.where = event.params.where;
  permissionEntity.who = event.params.who;
  permissionEntity.actor = event.params.here;
  permissionEntity.condition = event.params.condition;
  permissionEntity.save();
}

export function handleRevoked(event: Revoked): void {
  // permission
  let permissionId =
    event.params.where.toHexString() +
    '_' +
    event.params.permissionId.toHexString() +
    '_' +
    event.params.who.toHexString();
  let permissionEntity = Permission.load(permissionId);
  if (permissionEntity) {
    store.remove('Permission', permissionId);
  }
}

export function handleTrustedForwarderSet(event: TrustedForwarderSet): void {
  let daoId = event.address.toHexString();
  let entity = Dao.load(daoId);
  if (entity) {
    entity.trustedForwarder = event.params.forwarder;
    entity.save();
  }
}

export function handleSignatureValidatorSet(
  event: SignatureValidatorSet
): void {
  let daoId = event.address.toHexString();
  let entity = Dao.load(daoId);
  if (entity) {
    entity.signatureValidator = event.params.signatureValidator;
    entity.save();
  }
}

export function handleStandardCallbackRegistered(
  event: StandardCallbackRegistered
): void {
  let daoId = event.address.toHexString();
  let entityId = `${daoId}_${event.params.interfaceId.toHexString()}`;
  let entity = StandardCallback.load(entityId);
  if (!entity) {
    entity = new StandardCallback(entityId);
    entity.dao = daoId;
  }
  entity.interfaceId = event.params.interfaceId;
  entity.callbackSelector = event.params.callbackSelector;
  entity.magicNumber = event.params.magicNumber;
  entity.save();
}
