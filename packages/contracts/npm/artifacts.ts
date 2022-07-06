// JSON artifacts of the contracts

// Core contracts
import * as PermissionManager from '../artifacts/contracts/core/permission/PermissionManager.sol/PermissionManager.json';
import * as PermissionLib from '../artifacts/contracts/core/permission/PermissionManager.sol/PermissionLib.json';
import * as IPermissionOracle from '../artifacts/contracts/core/permission/IPermissionOracle.sol/IPermissionOracle.json';
import * as DAO from '../artifacts/contracts/core/DAO.sol/DAO.json';
import * as IDAO from '../artifacts/contracts/core/IDAO.sol/IDAO.json';
import * as Component from '../artifacts/contracts/core/component/Component.sol/Component.json';
import * as DAOPermissioned from '../artifacts/contracts/core/component/DAOPermissioned.sol/DAOPermissioned.json';

// Factories
import * as DAOFactory from '../artifacts/contracts/factory/DAOFactory.sol/DAOFactory.json';
import * as TokenFactory from '../artifacts/contracts/factory/TokenFactory.sol/TokenFactory.json';

// Registry
import * as Registry from '../artifacts/contracts/registry/Registry.sol/Registry.json';

// Tokens
import * as GovernanceERC20 from '../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json';
import * as GovernanceWrappedERC20 from '../artifacts/contracts/tokens/GovernanceWrappedERC20.sol/GovernanceWrappedERC20.json';
import * as MerkleDistributor from '../artifacts/contracts/tokens/MerkleDistributor.sol/MerkleDistributor.json';
import * as MerkleMinter from '../artifacts/contracts/tokens/MerkleMinter.sol/MerkleMinter.json';

// Voting (future packages)
import * as ERC20Voting from '../artifacts/contracts/votings/erc20/ERC20Voting.sol/ERC20Voting.json';
import * as AllowlistVoting from '../artifacts/contracts/votings/allowlist/AllowlistVoting.sol/AllowlistVoting.json';

export default {
  PermissionManager,
  PermissionLib,
  IPermissionOracle,
  DAO,
  IDAO,
  Component,
  DAOPermissioned,
  DAOFactory,
  TokenFactory,
  Registry,
  GovernanceERC20,
  GovernanceWrappedERC20,
  MerkleDistributor,
  MerkleMinter,
  ERC20Voting,
  AllowlistVoting,
};
