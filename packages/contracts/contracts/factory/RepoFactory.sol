/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../utils/Proxy.sol";
import "../registry/AragonPluginRegistry.sol";
import "../APM/Repo.sol";

/// @title RepoFactory to create a Repo
/// @author Sarkawt Noori - Aragon Association - 2022
/// @notice This contract is used to create a Repo and register it on AragonPluginRegistry contract.
contract RepoFactory {
    AragonPluginRegistry public aragonPluginRegistry;
    address public repoBase;

    error ApmRegEmpityName();

    constructor(AragonPluginRegistry _aragonPluginRegistry) {
        aragonPluginRegistry = _aragonPluginRegistry;

        setupBases();
    }

    /// @notice Create new repo in registry with `_name`
    /// @param _name Repo name, must be ununsed
    /// TODO: Rethink if it need permission to prevent it from getting poluted, same for newRepoWithVersion
    function newRepo(string calldata _name, address _dev) external returns (Repo) {
        return _newRepo(_name, _dev);
    }

    /// @notice Create new repo in registry with `_name` and publish a first version with contract `_pluginFactoryAddress` and content `@fromHex(_contentURI)`
    /// @param _name Repo name
    /// @param _initialSemanticVersion Semantic version for new repo version
    /// @param _pluginFactoryAddress address for smart contract logic for version (if set to 0, it uses last versions' contractAddress)
    /// @param _contentURI External URI for fetching new version's content
    function newRepoWithVersion(
        string calldata _name,
        uint16[3] memory _initialSemanticVersion,
        address _pluginFactoryAddress,
        bytes memory _contentURI,
        address _dev
    ) public returns (Repo repo) {
        repo = _newRepo(_name, address(this)); // need to have permissions to create version
        repo.newVersion(_initialSemanticVersion, _pluginFactoryAddress, _contentURI);

        // setup permissions
        setRepoPermissions(repo, _dev);
    }

    /// @dev Does set the required permissions for the new Repo.
    /// @param repo The Repo instance just created.
    /// @param dev The dev's wallet address
    function setRepoPermissions(Repo repo, address dev) internal {
        // set roles on the dao itself.
        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](5);

        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, repo.CREATE_VERSION_ROLE(), dev);
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, repo.UPGRADE_ROLE(), dev);
        items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, repo.ROOT_ROLE(), dev);

        // Revoke permissions from APM
        items[3] = ACLData.BulkItem(ACLData.BulkOp.Revoke, repo.ROOT_ROLE(), address(this));
        items[4] = ACLData.BulkItem(
            ACLData.BulkOp.Revoke,
            repo.CREATE_VERSION_ROLE(),
            address(this)
        );

        repo.bulk(address(repo), items);
    }

    /// @dev Does set the required permissions for the new Repo.
    /// @param _name The Repo instance just created.
    /// @param _initialOwner The initial owner wallet address
    function _newRepo(string calldata _name, address _initialOwner) internal returns (Repo repo) {
        if (!(bytes(_name).length > 0)) revert ApmRegEmpityName();

        repo = Repo(
            createProxy(repoBase, abi.encodeWithSelector(Repo.initialize.selector, _initialOwner))
        );

        aragonPluginRegistry.register(_name, address(repo));
    }

    // @dev Internal helper method to set up the required base contracts.
    function setupBases() private {
        repoBase = address(new Repo());
    }
}
