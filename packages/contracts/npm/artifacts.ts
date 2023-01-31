// JSON artifacts of the contracts

// Core contracts
import * as PermissionManager from '../artifacts/src/core/permission/PermissionManager.sol/PermissionManager.json';
import * as PermissionLib from '../artifacts/src/core/permission/PermissionLib.sol/PermissionLib.json';
import * as IPermissionCondition from '../artifacts/src/core/permission/IPermissionCondition.sol/IPermissionCondition.json';
import * as DAO from '../artifacts/src/core/dao/DAO.sol/DAO.json';
import * as IDAO from '../artifacts/src/core/dao/IDAO.sol/IDAO.json';
import * as DaoAuthorizable from '../artifacts/src/core/plugin/dao-authorizable/DaoAuthorizable.sol/DaoAuthorizable.json';

// Framework contracts
import * as DAOFactory from '../artifacts/src/framework/dao/DAOFactory.sol/DAOFactory.json';
import * as TokenFactory from '../artifacts/src/framework/utils/TokenFactory.sol/TokenFactory.json';
import * as DAORegistry from '../artifacts/src/framework/dao/DAORegistry.sol/DAORegistry.json';

// Plugin Contracts
import * as TokenVoting from '../artifacts/src/plugins/governance/majority-voting/token/TokenVoting.sol/TokenVoting.json';
import * as AddresslistVoting from '../artifacts/src/plugins/governance/majority-voting/addresslist/AddresslistVoting.sol/AddresslistVoting.json';
import * as MerkleMinter from '../artifacts/src/plugins/token/MerkleMinter.sol/MerkleMinter.json';
import * as MerkleDistributor from '../artifacts/src/plugins/token/MerkleDistributor.sol/MerkleDistributor.json';

import * as GovernanceERC20 from '../artifacts/src/token/ERC20/governance/GovernanceERC20.sol/GovernanceERC20.json';
import * as GovernanceWrappedERC20 from '../artifacts/src/token/ERC20/governance/GovernanceWrappedERC20.sol/GovernanceWrappedERC20.json';

export default {
  PermissionManager,
  PermissionLib,
  IPermissionCondition,
  DAO,
  IDAO,
  DaoAuthorizable,
  DAOFactory,
  TokenFactory,
  DAORegistry,
  GovernanceERC20,
  GovernanceWrappedERC20,
  MerkleDistributor,
  MerkleMinter,
  TokenVoting,
  AddresslistVoting,
};
