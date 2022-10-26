// JSON artifacts of the contracts

// Core Primitives

//// Permission
import * as PermissionManager from '../artifacts/contracts/core/primitives/permission/PermissionManager.sol/PermissionManager.json';
import * as PermissionLib from '../artifacts/contracts/core/primitives/permission/PermissionLib.sol/PermissionLib.json';
import * as IPermissionOracle from '../artifacts/contracts/core/primitives/permission/IPermissionOracle.sol/IPermissionOracle.json';

//// DAO
import * as DAO from '../artifacts/contracts/core/primitives/dao/DAO.sol/DAO.json';
import * as IDAO from '../artifacts/contracts/core/primitives/dao/IDAO.sol/IDAO.json';
import * as DaoAuthorizable from '../artifacts/contracts/core/primitives/dao-authorizable/DaoAuthorizable.sol/DaoAuthorizable.json';
import * as DaoAuthorizableCloneable from '../artifacts/contracts/core/primitives/dao-authorizable/DaoAuthorizableCloneable.sol/DaoAuthorizableCloneable.json';
import * as DaoAuthorizableUpgradeable from '../artifacts/contracts/core/primitives/dao-authorizable/DaoAuthorizableUpgradeable.sol/DaoAuthorizableUpgradeable.json';

// Infrastructure

//// DAO Creation
import * as DAOFactory from '../artifacts/contracts/core/infrastructure/dao/DAOFactory.sol/DAOFactory.json';
import * as DAORegistry from '../artifacts/contracts/core/infrastructure/dao/DAORegistry.sol/DAORegistry.json';

//// Plugin Management

////// Curation
import * as PluginRepoFactory from '../artifacts/contracts/core/infrastructure/plugin/registry/PluginRepoFactory.sol/PluginRepoFactory.json';
import * as PluginRepoRegistry from '../artifacts/contracts/core/infrastructure/plugin/registry/PluginRepoRegistry.sol/PluginRepoRegistry.json';

////// Setup
import * as PluginSetup from '../artifacts/contracts/core/infrastructure/plugin/setup/PluginSetup.sol/PluginSetup.json';
import * as PluginSetupProcessor from '../artifacts/contracts/core/infrastructure/plugin/setup/PluginSetupProcessor.sol/PluginSetupProcessor.json';

//// Plugins

////// Majority Voting
import * as ERC20Voting from '../artifacts/contracts/plugins/majority-voting/erc20/ERC20Voting.sol/ERC20Voting.json';
import * as AllowlistVoting from '../artifacts/contracts/plugins/majority-voting/allowlist/AllowlistVoting.sol/AllowlistVoting.json';

////// Token Creation
import * as MerkleMinter from '../artifacts/contracts/plugins/token-creation/MerkleMinter.sol/MerkleMinter.json';
import * as MerkleDistributor from '../artifacts/contracts/plugins/token-creation/MerkleDistributor.sol/MerkleDistributor.json';

// Tokens
import * as GovernanceERC20 from '../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json';
import * as GovernanceWrappedERC20 from '../artifacts/contracts/tokens/GovernanceWrappedERC20.sol/GovernanceWrappedERC20.json';

// To be deprecated
import * as TokenFactory from '../artifacts/contracts/core/infrastructure/deprecated/TokenFactory.sol/TokenFactory.json';

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
