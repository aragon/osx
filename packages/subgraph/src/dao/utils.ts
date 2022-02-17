import {DaoPackage, ERC20VotingPackage} from '../../generated/schema';
import {Address, DataSourceContext, store} from '@graphprotocol/graph-ts';
import {ERC20Voting} from '../../generated/templates';
import {ERC20Voting as ERC20VotingContract} from '../../generated/templates/ERC20Voting/ERC20Voting';
import {handleERC20Token} from '../utils/tokens';

export function addPackage(daoId: string, who: Address): void {
  let daoPackageEntityId = daoId + '_' + who.toHexString();
  let daoPackageEntity = new DaoPackage(daoPackageEntityId);
  daoPackageEntity.pkg = who.toHexString();
  daoPackageEntity.dao = daoId;
  daoPackageEntity.save();

  // package
  // TODO: select the correct package according to supporting interface
  let packageEntity = ERC20VotingPackage.load(who.toHexString());
  if (!packageEntity) {
    packageEntity = new ERC20VotingPackage(who.toHexString());
    let contract = ERC20VotingContract.bind(who);
    let supportRequiredPct = contract.try_supportRequiredPct();
    let minAcceptQuorumPct = contract.try_minAcceptQuorumPct();
    let minDuration = contract.try_minDuration();
    let token = contract.try_token();

    packageEntity.supportRequiredPct = supportRequiredPct.reverted
      ? null
      : supportRequiredPct.value;
    packageEntity.minAcceptQuorumPct = minAcceptQuorumPct.reverted
      ? null
      : minAcceptQuorumPct.value;
    packageEntity.minDuration = minDuration.reverted ? null : minDuration.value;

    let tokenId = handleERC20Token(token.value);

    packageEntity.token = token.reverted ? null : tokenId;

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    ERC20Voting.createWithContext(who, context);

    packageEntity.save();
  }
}

export function removePackage(daoId: string, who: string): void {
  let daoPackageEntityId = daoId + '_' + who;
  let daoPackageEntity = DaoPackage.load(daoPackageEntityId);
  if (daoPackageEntity) {
    store.remove('DaoPackage', daoPackageEntityId);
  }
}
