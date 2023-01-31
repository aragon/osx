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

//// plugin
import * as PluginRepo from '../artifacts/src/framework/plugin/repo/PluginRepo.sol/PluginRepo.json';
import * as PluginRepoFactory from '../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';
import * as PluginRepoRegistry from '../artifacts/src/framework/plugin/repo/PluginRepoRegistry.sol/PluginRepoRegistry.json';

// plugins
import * as TokenVoting from '../artifacts/src/plugins/governance/majority-voting/token/TokenVoting.sol/TokenVoting.json';
import * as AddresslistVoting from '../artifacts/src/plugins/governance/majority-voting/addresslist/AddresslistVoting.sol/AddresslistVoting.json';
import * as Admin from '../artifacts/src/plugins/governance/majority-voting/token/TokenVoting.sol/TokenVoting.json';
import * as Multisig from '../artifacts/src/plugins/governance/majority-voting/addresslist/AddresslistVoting.sol/AddresslistVoting.json';
import * as MerkleMinter from '../artifacts/src/plugins/token/MerkleMinter.sol/MerkleMinter.json';
import * as MerkleDistributor from '../artifacts/src/plugins/token/MerkleDistributor.sol/MerkleDistributor.json';

// token
//// governance
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

  TokenVoting,
  AddresslistVoting,
  Admin,
  Multisig,

  MerkleMinter,
  MerkleDistributor,

  GovernanceERC20,
  GovernanceWrappedERC20,
};
