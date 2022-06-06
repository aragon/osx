/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../registry/APMRegistry.sol";
import "../APM/Repo.sol";

contract RepoFactory {

    APMRegistry apmRegistry;

    error ApmRegEmpityName();

    constructor(APMRegistry _apmRegistry) {
        apmRegistry = _apmRegistry;
    }

    /**
     * @notice Create new repo in registry with `_name`
     * @param _name Repo name, must be ununsed
     */
    function newRepo(string calldata _name) external returns (Repo) {
        return _newRepo(_name, msg.sender);
    }

    /**
     * @notice Create new repo in registry with `_name` and publish a first version with contract `_pluginFactoryAddress` and content `@fromHex(_contentURI)`
     * @param _name Repo name
     * @param _initialSemanticVersion Semantic version for new repo version
     * @param _pluginFactoryAddress address for smart contract logic for version (if set to 0, it uses last versions' contractAddress)
     * @param _contentURI External URI for fetching new version's content
     */
    function newRepoWithVersion(
        string calldata _name,
        uint16[3] memory _initialSemanticVersion,
        address _pluginFactoryAddress,
        bytes memory _contentURI
    ) public returns (Repo repo) {
        repo = _newRepo(_name, address(this)); // need to have permissions to create version
        repo.newVersion(_initialSemanticVersion, _pluginFactoryAddress, _contentURI);

        // setup permissions
        setRepoPermissions(repo, msg.sender);
    }

    function setRepoPermissions(Repo repo, address dev) internal {
        // set roles on the dao itself.
        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](5);

        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, repo.CREATE_VERSION_ROLE(), dev);
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, repo.UPGRADE_ROLE(), dev);
        items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, repo.ROOT_ROLE(), dev);

        // Revoke permissions from APM
        items[3] = ACLData.BulkItem(ACLData.BulkOp.Revoke, repo.ROOT_ROLE(), address(this));
        items[4] = ACLData.BulkItem(ACLData.BulkOp.Revoke, repo.CREATE_VERSION_ROLE(), address(this));

        repo.bulk(address(repo), items);
    }

    function _newRepo(string calldata _name, address initialOwner) internal returns (Repo repo) {
        if (!(bytes(_name).length > 0)) revert ApmRegEmpityName();

        repo = new Repo();
        repo.initialize(initialOwner);

        apmRegistry.register(_name, address(repo));
    }
}
