import {DaoPackage, EVPackage} from '../../generated/schema';
import {Address, DataSourceContext, store} from '@graphprotocol/graph-ts';
import {SimpleVoting} from '../../generated/templates';
import {SimpleVoting as SimpleVotingContract} from '../../generated/templates/SimpleVoting/SimpleVoting';
import {handleERC20Token} from '../utils/tokens';

export function addPackage(daoId: string, who: Address): void {
  let daoPackageEntityId = daoId + '_' + who.toHexString();
  let daoPackageEntity = new DaoPackage(daoPackageEntityId);
  daoPackageEntity.pkg = who.toHexString();
  daoPackageEntity.dao = daoId;
  daoPackageEntity.save();

  // package
  // TODO: select the correct package according to supporting interface
  let packageEntity = EVPackage.load(who.toHexString());
  if (!packageEntity) {
    packageEntity = new EVPackage(who.toHexString());
    let contract = SimpleVotingContract.bind(who);
    let supportRequiredPct = contract.try_supportRequiredPct();
    let minAcceptQuorumPct = contract.try_minAcceptQuorumPct();
    let voteTime = contract.try_voteTime();
    let token = contract.try_token();

    packageEntity.supportRequiredPct = supportRequiredPct.reverted
      ? null
      : supportRequiredPct.value;
    packageEntity.minAcceptQuorumPct = minAcceptQuorumPct.reverted
      ? null
      : minAcceptQuorumPct.value;
    packageEntity.voteTime = voteTime.reverted ? null : voteTime.value;

    let tokenId = handleERC20Token(token.value);

    packageEntity.token = token.reverted ? null : tokenId;

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    SimpleVoting.createWithContext(who, context);

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
