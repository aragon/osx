import {Address} from '@graphprotocol/graph-ts';

export function getDaoId(dao: Address): string {
  return dao.toHexString();
}
