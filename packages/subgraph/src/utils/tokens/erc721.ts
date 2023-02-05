import {Address, Bytes, ethereum, log} from '@graphprotocol/graph-ts';
import {
  ERC721Balance,
  ERC721Token,
  ERC721Transfer
} from '../../../generated/schema';
import {ERC721} from '../../../generated/templates/DaoTemplate/ERC721';
import {supportsInterface} from '../erc165';

enum TypeHere {
  Withdraw,
  Deposit
}

export function handleERC721(
  tokenAddress: Address,
  daoAddress: string,
  data: Bytes,
  type: TypeHere
) {
  // Double check that it's ERC721 by calling supportsInterface checks.
  const erc721 = ERC721.bind(tokenAddress);
  let introspection_01ffc9a7 = supportsInterface(erc721, '01ffc9a7'); // ERC165
  let introspection_80ac58cd = supportsInterface(erc721, '80ac58cd'); // ERC721
  let introspection_00000000 = supportsInterface(erc721, '00000000', false);
  let isERC721 =
    introspection_01ffc9a7 && introspection_80ac58cd && introspection_00000000;
  if (!isERC721) {
    return;
  }

  const tokenAddressId = tokenAddress.toHexString();

  // encoded needs to start with `'0x0000000000000000000000000000000000000000000000000000000000000020'`
  // when emitted realtime, but not from tests as it includes that already
  const encoded =
    '0x0000000000000000000000000000000000000000000000000000000000000020' +
    data.toHexString().slice(10);

  const decoded = ethereum.decode(
    '(address,address,uint256,bytes)', // from, tokenId, 
    Bytes.fromHexString(encoded)
  );

  if (decoded) {
    log.debug('DECODED CORRECTLY {}', ['12345']);
    const from = decoded.toTuple()[0].toAddress();
    const tokenId = decoded.toTuple()[2].toBigInt();

    //   let transferId = event.address.toHexString() +
    //           '_' + event.transaction.hash.toHexString()
    //           '_' + event.transactionLogIndex.toHexString();
    let transferId = '';

    let erc721TokenEntity = ERC721Token.load(tokenAddressId);

    if (!erc721TokenEntity) {
      erc721TokenEntity = new ERC721Token(tokenAddressId);
      const name = erc721.try_name();
      const symbol = erc721.try_symbol();
      erc721TokenEntity.name = name.reverted ? '' : name.value;
      erc721TokenEntity.symbol = symbol.reverted ? '' : symbol.value;
      erc721TokenEntity.save();
    }

    let entity = new ERC721Transfer(transferId);

    if (type == TypeHere.Deposit) {
      entity.from = from;
      // entity.to = daoAddress;
    } else {
      // entity.from = daoAddress;
      // entity.to =
    }
    entity.dao = daoAddress;
    entity.tokenId = tokenId;
    entity.type = 'Deposit';
    entity.token = tokenAddressId;
    entity.save();

    let balanceId = daoAddress + '_' + tokenAddressId;
    let balanceEntity = ERC721Balance.load(balanceId);
    if (!balanceEntity) {
      balanceEntity = new ERC721Balance(balanceId);
      balanceEntity.dao = daoAddress;
      balanceEntity.token = tokenAddressId;
      let tokenIds = [tokenId];
      balanceEntity.tokenIds = tokenIds;
    } else {
      let tokenIds = balanceEntity.tokenIds;
      tokenIds.push(tokenId);
      balanceEntity.tokenIds = tokenIds;
    }
    //   balanceEntity.lastUpdated = event.block.timestamp;
    balanceEntity.save();
  }
}
