// JSON artifacts of the contracts

// Core contracts
import * as PermissionManager from '../artifacts/contracts/core/permission/PermissionManager.sol/PermissionManager.json';
import * as PermissionLib from '../artifacts/contracts/core/permission/PermissionLib.sol/PermissionLib.json';
import * as IPermissionOracle from '../artifacts/contracts/core/permission/IPermissionOracle.sol/IPermissionOracle.json';
import * as DAO from '../artifacts/contracts/core/DAO.sol/DAO.json';
import * as IDAO from '../artifacts/contracts/core/IDAO.sol/IDAO.json';
import * as DaoAuthorizable from '../artifacts/contracts/core/component/dao-authorizable/DaoAuthorizable.sol/DaoAuthorizable.json';

// Factories
import * as DAOFactory from '../artifacts/contracts/factory/DAOFactory.sol/DAOFactory.json';
import * as TokenFactory from '../artifacts/contracts/factory/TokenFactory.sol/TokenFactory.json';

// Registry
import * as DAORegistry from '../artifacts/contracts/registry/DAORegistry.sol/DAORegistry.json';

// Tokens
import * as GovernanceERC20 from '../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json';
import * as GovernanceWrappedERC20 from '../artifacts/contracts/tokens/GovernanceWrappedERC20.sol/GovernanceWrappedERC20.json';

// DAO Plugins
import * as TokenVoting from '../artifacts/contracts/voting/token/TokenVoting.sol/TokenVoting.json';
import * as AddresslistVoting from '../artifacts/contracts/voting/addresslist/AddresslistVoting.sol/AddresslistVoting.json';
import * as MerkleDistributor from '../artifacts/contracts/tokens/MerkleDistributor.sol/MerkleDistributor.json';
import * as MerkleMinter from '../artifacts/contracts/tokens/MerkleMinter.sol/MerkleMinter.json';

export default {
  PermissionManager,
  PermissionLib,
  IPermissionOracle,
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
