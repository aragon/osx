// JSON artifacts of the contracts

// core
//// dao
import * as DAO from '../artifacts/src/core/dao/DAO.sol/DAO.json';

//// Permission
import * as PermissionManager from '../artifacts/src/core/permission/PermissionManager.sol/PermissionManager.json';
import * as PermissionLib from '../artifacts/src/core/permission/PermissionLib.sol/PermissionLib.json';

// framework
//// dao
import * as DAOFactory from '../artifacts/src/framework/dao/DAOFactory.sol/DAOFactory.json';
import * as DAORegistry from '../artifacts/src/framework/dao/DAORegistry.sol/DAORegistry.json';
import * as TokenFactory from '../artifacts/src/framework/utils/TokenFactory.sol/TokenFactory.json';

//// Plugin
///// Repo
import * as PluginRepo from '../artifacts/src/framework/plugin/repo/PluginRepo.sol/PluginRepo.json';
import * as PluginRepoFactory from '../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';
import * as PluginRepoRegistry from '../artifacts/src/framework/plugin/repo/PluginRepoRegistry.sol/PluginRepoRegistry.json';

///// Setup
import * as PluginSetupProcessor from '../artifacts/src/framework/plugin/setup/PluginSetupProcessor.sol/PluginSetupProcessor.json';

// Plugins
//// Governance
////// Admin
import * as Admin from '../artifacts/src/plugins/governance/admin/Admin.sol/Admin.json';
import * as AdminSetup from '../artifacts/src/plugins/governance/admin/AdminSetup.sol/AdminSetup.json';

////// MajorityVoting
//////// AddresslistVoting
import * as AddresslistVoting from '../artifacts/src/plugins/governance/majority-voting/addresslist/AddresslistVoting.sol/AddresslistVoting.json';
import * as AddresslistVotingSetup from '../artifacts/src/plugins/governance/majority-voting/addresslist/AddresslistVotingSetup.sol/AddresslistVotingSetup.json';

//////// TokenVoting
import * as TokenVoting from '../artifacts/src/plugins/governance/majority-voting/token/TokenVoting.sol/TokenVoting.json';
import * as TokenVotingSetup from '../artifacts/src/plugins/governance/majority-voting/token/TokenVotingSetup.sol/TokenVotingSetup.json';

////// Multisig
import * as Multisig from '../artifacts/src/plugins/governance/multisig/Multisig.sol/Multisig.json';
import * as MultisigSetup from '../artifacts/src/plugins/governance/multisig/MultisigSetup.sol/MultisigSetup.json';

//// Token Creation
import * as MerkleMinter from '../artifacts/src/plugins/token/MerkleMinter.sol/MerkleMinter.json';
import * as MerkleDistributor from '../artifacts/src/plugins/token/MerkleDistributor.sol/MerkleDistributor.json';

// Token
//// ERC20
////// Governance
import * as GovernanceERC20 from '../artifacts/src/token/ERC20/governance/GovernanceERC20.sol/GovernanceERC20.json';
import * as GovernanceWrappedERC20 from '../artifacts/src/token/ERC20/governance/GovernanceWrappedERC20.sol/GovernanceWrappedERC20.json';

export default {
  DAO,
  PermissionManager,
  PermissionLib,

  DAOFactory,
  TokenFactory,
  DAORegistry,

  PluginRepo,
  PluginRepoFactory,
  PluginRepoRegistry,

  PluginSetupProcessor,

  Admin,
  AdminSetup,
  AddresslistVoting,
  AddresslistVotingSetup,
  TokenVoting,
  TokenVotingSetup,
  Multisig,
  MultisigSetup,

  MerkleMinter,
  MerkleDistributor,

  GovernanceERC20,
  GovernanceWrappedERC20,
};
