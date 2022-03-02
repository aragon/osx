import {NewDAORegistered} from '../generated/Registry/Registry';
import {DaoTemplate} from '../generated/templates';
import {Dao} from '../generated/schema';
import {handleERC20Token} from './utils/tokens';

export function handleNewDAORegistered(event: NewDAORegistered): void {
  let id = event.params.dao.toHexString(); // use dao address as id, because it should not repeat
  let entity = new Dao(id);

  entity.name = event.params.name;
  entity.creator = event.params.creator;
  entity.createdAt = event.block.timestamp;

  let tokenId = handleERC20Token(event.params.token);

  entity.token = tokenId;

  // subscribe to templates
  DaoTemplate.create(event.params.dao);

  entity.save();
}
