// JSON artifacts of the contracts
import * as DAO from '../artifacts/src/core/dao/DAO.sol/DAO.json';
import * as PermissionManager from '../artifacts/src/core/permission/PermissionManager.sol/PermissionManager.json';
import * as DAOFactory from '../artifacts/src/framework/dao/DAOFactory.sol/DAOFactory.json';
import * as DAORegistry from '../artifacts/src/framework/dao/DAORegistry.sol/DAORegistry.json';
import * as PluginRepo from '../artifacts/src/framework/plugin/repo/PluginRepo.sol/PluginRepo.json';
import * as PluginRepoFactory from '../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';
import * as PluginRepoRegistry from '../artifacts/src/framework/plugin/repo/PluginRepoRegistry.sol/PluginRepoRegistry.json';
import * as PluginSetupProcessor from '../artifacts/src/framework/plugin/setup/PluginSetupProcessor.sol/PluginSetupProcessor.json';

export default {
  DAO,
  PermissionManager,

  DAOFactory,
  DAORegistry,

  PluginRepo,
  PluginRepoFactory,
  PluginRepoRegistry,

  PluginSetupProcessor,
};
