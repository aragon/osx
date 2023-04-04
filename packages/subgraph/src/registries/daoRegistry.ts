import {DAORegistered} from '../../generated/DAORegistry/DAORegistry';
import {DaoTemplateV1_0_0, DaoTemplateV1_2_0} from '../../generated/templates';
import {Dao} from '../../generated/schema';
import {dataSource} from '@graphprotocol/graph-ts';

// blocklists of addresses for which we don't index the subdomain.
// Put the reason next to the address as a comment
const subdomain_blocklist_mainnet = [
  '0x16070493aa513f91fc8957f14b7b7c6c0c41fbac' // domain squatting lido.dao.eth
];

export function handleDAORegistered(event: DAORegistered): void {
  let id = event.params.dao.toHexString(); // use dao address as id, because it should not repeat
  let entity = new Dao(id);

  if (!isInSubdomainBlocklist(id)) {
    entity.subdomain = event.params.subdomain;
  }

  entity.creator = event.params.creator;
  entity.createdAt = event.block.timestamp;

  // subscribe to templates
  DaoTemplateV1_0_0.create(event.params.dao);
  DaoTemplateV1_2_0.create(event.params.dao);

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
