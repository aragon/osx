import {
  Action,
  AdministratorAdminPlugin,
  AdminProposal,
  Administrator,
} from '../../../generated/schema';
import {AdminMembers} from '../../../generated/templates';
import {
  MembershipContractAnnounced,
  ProposalCreated,
  ProposalExecuted,
} from '../../../generated/templates/Admin/Admin';
import {generateAdministratorAdminPluginEntityId} from '../../utils/ids';
import {
  generateActionEntityId,
  generatePluginEntityId,
  generateProposalEntityId,
} from '@aragon/osx-commons-subgraph';
import {dataSource, DataSourceContext} from '@graphprotocol/graph-ts';

export function handleProposalCreated(event: ProposalCreated): void {
  let context = dataSource.context();
  let daoId = context.getString('daoAddress');
  let metdata = event.params.metadata.toString();
  _handleProposalCreated(event, daoId, metdata);
}

// work around: to bypass context and ipfs for testing, as they are not yet supported by matchstick
export function _handleProposalCreated(
  event: ProposalCreated,
  daoId: string,
  metadata: string
): void {
  let pluginProposalId = event.params.proposalId;
  let pluginAddress = event.address;
  let pluginEntityId = generatePluginEntityId(pluginAddress);
  let proposalEntityId = generateProposalEntityId(
    pluginAddress,
    pluginProposalId
  );
  let administratorAddress = event.params.creator;

  let proposalEntity = new AdminProposal(proposalEntityId);
  proposalEntity.dao = daoId;
  proposalEntity.plugin = pluginEntityId;
  proposalEntity.pluginProposalId = pluginProposalId;
  proposalEntity.creator = administratorAddress;
  proposalEntity.metadata = metadata;
  proposalEntity.executed = false;
  proposalEntity.createdAt = event.block.timestamp;
  proposalEntity.startDate = event.params.startDate;
  proposalEntity.endDate = event.params.endDate;
  proposalEntity.administrator = administratorAddress.toHexString();
  proposalEntity.allowFailureMap = event.params.allowFailureMap;
  let administratorEntityId = generateAdministratorAdminPluginEntityId(
    administratorAddress,
    pluginAddress
  );
  let adminMemberEntity = AdministratorAdminPlugin.load(administratorEntityId);
  if (!adminMemberEntity) {
    adminMemberEntity = new AdministratorAdminPlugin(administratorEntityId);
    adminMemberEntity.administrator = administratorAddress.toHexString();
    adminMemberEntity.plugin = pluginEntityId;
    adminMemberEntity.save();
  }
  let administratorEntity = Administrator.load(
    administratorAddress.toHexString()
  );
  if (!administratorEntity) {
    administratorEntity = new Administrator(administratorAddress.toHexString());
    administratorEntity.address = administratorAddress.toHexString();
    administratorEntity.save();
  }

  // actions
  let actions = event.params.actions;
  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];

    let actionEntityId = generateActionEntityId(proposalEntityId, index);
    let actionEntity = new Action(actionEntityId);
    actionEntity.to = action.to;
    actionEntity.value = action.value;
    actionEntity.data = action.data;
    actionEntity.dao = daoId;
    actionEntity.proposal = proposalEntityId;
    actionEntity.save();
  }

  proposalEntity.save();
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let pluginProposalId = event.params.proposalId;
  let proposalEntityId = generateProposalEntityId(
    event.address,
    pluginProposalId
  );

  let proposalEntity = AdminProposal.load(proposalEntityId);
  if (proposalEntity) {
    proposalEntity.executed = true;
    proposalEntity.executionTxHash = event.transaction.hash;
    proposalEntity.save();
  }
}

export function handleMembershipContractAnnounced(
  event: MembershipContractAnnounced
): void {
  let context = new DataSourceContext();
  context.setString('pluginAddress', event.address.toHexString());
  context.setString(
    'permissionId',
    '0xf281525e53675515a6ba7cc7bea8a81e649b3608423ee2d73be1752cea887889' // keccack256 of EXECUTE_PROPOSAL_PERMISSION
  );
  AdminMembers.createWithContext(event.params.definingContract, context);
}
