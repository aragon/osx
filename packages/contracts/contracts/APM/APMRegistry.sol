/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../core/component/MetaTxComponent.sol";
import "./Repo.sol";

contract APMInternalAppNames {
    string internal constant APM_APP_NAME = "apm-registry";
    string internal constant REPO_APP_NAME = "apm-repo";
    string internal constant ENS_SUB_APP_NAME = "apm-enssub";
}

contract APMRegistry is APMInternalAppNames, MetaTxComponent {
    address public repoBase;

    error ApmRegEmpityName();

    event NewRepo(string name, address repo);

    /// @dev Used for UUPS upgradability pattern
    function initialize(IDAO _dao, address _gsnForwarder) external initializer {
        __MetaTxComponent_init(_dao, _gsnForwarder);

        repoBase = address(new Repo());
    }

    /// @notice Returns the version of the GSN relay recipient
    /// @dev Describes the version and contract for GSN compatibility
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.APMRegistry";
    }

    /**
     * @notice Create new repo in registry with `_name`
     * @param _name Repo name, must be ununsed
     */
    function newRepo(string calldata _name) external returns (Repo) {
        return _newRepo(_name, msg.sender);
    }

    /**
     * @notice Create new repo in registry with `_name` and publish a first version with contract `_contractAddress` and content `@fromHex(_contentURI)`
     * @param _name Repo name
     * @param _initialSemanticVersion Semantic version for new repo version
     * @param _contractAddress address for smart contract logic for version (if set to 0, it uses last versions' contractAddress)
     * @param _contentURI External URI for fetching new version's content
     */
    function newRepoWithVersion(
        string calldata _name,
        uint16[3] memory _initialSemanticVersion,
        address _contractAddress,
        bytes memory _contentURI
    ) public returns (Repo repo) {
        repo = _newRepo(_name, address(this)); // need to have permissions to create version
        repo.newVersion(_initialSemanticVersion, _contractAddress, _contentURI);

        // revoke permissions
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

        emit NewRepo(_name, address(repo));
    }
}
