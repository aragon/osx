import {DAORegistered} from '../../generated/DAORegistry/DAORegistry';
import {Dao} from '../../generated/schema';
import {DaoTemplateV1_0_0, DaoTemplateV1_3_0} from '../../generated/templates';
import {generateDaoEntityId} from '@aragon/osx-commons-subgraph';
import {dataSource} from '@graphprotocol/graph-ts';

// blocklists of addresses for which we don't index the subdomain.
// Put the reason next to the address as a comment
const subdomain_blocklist_mainnet = [
  '0x16070493aa513f91fc8957f14b7b7c6c0c41fbac', // domain squatting lido.dao.eth
];

export function handleDAORegistered(event: DAORegistered): void {
  let daoAddress = event.params.dao; // use dao address as id, because it should not repeat
  let daoEntityId = generateDaoEntityId(daoAddress);
  let entity = new Dao(daoEntityId);

  if (!isInSubdomainBlocklist(daoEntityId)) {
    entity.subdomain = event.params.subdomain;
  }

  entity.creator = event.params.creator;
  entity.createdAt = event.block.timestamp;
  entity.txHash = event.transaction.hash;

  // subscribe to both templates for different execution handling
  // check manifest file for details on how event handling is
  // differentiated between templates
  DaoTemplateV1_0_0.create(daoAddress);
  DaoTemplateV1_3_0.create(daoAddress);

  entity.save();
}

// checks if a certain address is in the blocklist. Returns false by default
function isInSubdomainBlocklist(address: string): bool {
  // switch case doesn't work with assemblyscript
  if (dataSource.network() == 'mainnet') {
    return subdomain_blocklist_mainnet.includes(address);
  }

  return false;
}
