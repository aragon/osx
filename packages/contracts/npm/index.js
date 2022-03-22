module.exports = {
  // Core
  ACL: require("../artifacts/contracts/core/acl/ACL.sol/ACL.json"),
  ACLData: require("../artifacts/contracts/core/acl/ACL.sol/ACLData.json"),
  IACLOracle: require(
    "../artifacts/contracts/core/acl/IACLOracle.sol/IACLOracle.json",
  ),
  DAO: require("../artifacts/contracts/core/DAO.sol/DAO.json"),
  IDAO: require("../artifacts/contracts/core/IDAO.sol/IDAO.json"),
  Component: require(
    "../artifacts/contracts/core/component/Component.sol/Component.json",
  ),
  Permissions: require(
    "../artifacts/contracts/core/component/Permissions.sol/Permissions.json",
  ),

  // Factories
  DAOFactory: require(
    "../artifacts/contracts/factories/DAOFactory.sol/DAOFactory.json",
  ),
  TokenFactory: require(
    "../artifacts/contracts/factories/TokenFactory.sol/TokenFactory.json",
  ),

  // Registry
  Registry: require(
    "../artifacts/contracts/registry/Registry.sol/Registry.json",
  ),

  // Tokens
  GovernanceERC20: require(
    "../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json",
  ),
  GovernanceWrappedERC20: require(
    "../artifacts/contracts/tokens/GovernanceWrappedERC20.sol/GovernanceWrappedERC20.json",
  ),
  MerkleDistributor: require(
    "../artifacts/contracts/tokens/MerkleDistributor.sol/MerkleDistributor.json",
  ),
  MerkleMinter: require(
    "../artifacts/contracts/tokens/MerkleMinter.sol/MerkleMinter.json",
  ),

  // Voting (future packages)
  ERC20Voting: require(
    "../artifacts/contracts/votings/ERC20Voting/ERC20Voting.sol/ERC20Voting.json",
  ),
  WhitelistVoting: require(
    "../artifacts/contracts/votings/whitelist/WhitelistVoting.sol/WhitelistVoting.json",
  ),
};
