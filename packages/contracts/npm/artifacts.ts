// JSON artifacts of the contracts

// DAO
//// Primitives
import * as DAO from '../artifacts/contracts/core/dao/primitives/DAO.sol/DAO.json';
import * as IDAO from '../artifacts/contracts/core/dao/primitives/IDAO.sol/IDAO.json';
//// Infrastructure
///// Factory
import * as DAOFactory from '../artifacts/contracts/core/dao/infrastructure/DAOFactory.sol/DAOFactory.json';
////// Registry
import * as DAORegistry from '../artifacts/contracts/core/dao/infrastructure/DAORegistry.sol/DAORegistry.json';

// Plugin
//// Infrastructure
///// Factory
import * as PluginRepoFactory from '../artifacts/contracts/core/plugin/infrastructure/factory/PluginRepoFactory.sol/PluginRepoFactory.json';
////// Registry
import * as PluginRepoRegistry from '../artifacts/contracts/core/plugin/infrastructure/registry/PluginRepoRegistry.sol/PluginRepoRegistry.json';
////// Setup
import * as PluginSetup from '../artifacts/contracts/core/plugin/infrastructure/setup/PluginSetup.sol/PluginSetup.json';
import * as PluginSetupProcessor from '../artifacts/contracts/core/plugin/infrastructure/setup/PluginSetupProcessor.sol/PluginSetupProcessor.json';

// General
//// Permission
import * as PermissionManager from '../artifacts/contracts/core/primitives/permission/PermissionManager.sol/PermissionManager.json';
import * as PermissionLib from '../artifacts/contracts/core/primitives/permission/PermissionLib.sol/PermissionLib.json';
import * as IPermissionOracle from '../artifacts/contracts/core/primitives/permission/IPermissionOracle.sol/IPermissionOracle.json';
//// DaoAuthorizable
import * as DaoAuthorizable from '../artifacts/contracts/core/primitives/dao-authorizable/DaoAuthorizable.sol/DaoAuthorizable.json';
import * as DaoAuthorizableCloneable from '../artifacts/contracts/core/primitives/dao-authorizable/DaoAuthorizableCloneable.sol/DaoAuthorizableCloneable.json';
import * as DaoAuthorizableUpgradeable from '../artifacts/contracts/core/primitives/dao-authorizable/DaoAuthorizableUpgradeable.sol/DaoAuthorizableUpgradeable.json';

// To be separated away from core:
// Plugins
//// Majority Voting
import * as ERC20Voting from '../artifacts/contracts/plugins/majority-voting/erc20/ERC20Voting.sol/ERC20Voting.json';
import * as AllowlistVoting from '../artifacts/contracts/plugins/majority-voting/allowlist/AllowlistVoting.sol/AllowlistVoting.json';
//// Token Creation
import * as MerkleMinter from '../artifacts/contracts/plugins/token-creation/MerkleMinter.sol/MerkleMinter.json';
import * as MerkleDistributor from '../artifacts/contracts/plugins/token-creation/MerkleDistributor.sol/MerkleDistributor.json';

// Tokens
import * as GovernanceERC20 from '../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json';
import * as GovernanceWrappedERC20 from '../artifacts/contracts/tokens/GovernanceWrappedERC20.sol/GovernanceWrappedERC20.json';

// To be deprecated:
import * as TokenFactory from '../artifacts/contracts/core/general/deprecated/TokenFactory.sol/TokenFactory.json';

export default {
  PermissionManager,
  PermissionLib,
  IPermissionOracle,

  DAO,
  IDAO,

  DaoAuthorizable,
  DaoAuthorizableCloneable,
  DaoAuthorizableUpgradeable,

  PluginRepoFactory,
  PluginRepoRegistry,

  PluginSetup,
  PluginSetupProcessor,

  DAOFactory,
  DAORegistry,

  ERC20Voting,
  AllowlistVoting,

  MerkleDistributor,
  MerkleMinter,

  GovernanceERC20,
  GovernanceWrappedERC20,

  TokenFactory,
};
