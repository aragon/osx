/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../utils/Proxy.sol";
import "../registry/AragonPluginRegistry.sol";
import "../APM/PluginRepo.sol";

/// @title PluginRepoFactory to create a PluginRepo
/// @author Sarkawt Noori - Aragon Association - 2022
/// @notice This contract is used to create a PluginRepo and register it on AragonPluginRegistry contract.
contract PluginRepoFactory {
    AragonPluginRegistry public aragonPluginRegistry;
    address public pluginRepoBase;

    error ApmRegEmptyName();

    constructor(AragonPluginRegistry _aragonPluginRegistry) {
        aragonPluginRegistry = _aragonPluginRegistry;

        setupBases();
    }

    /// @notice Create new pluginRepo in registry with `_name`
    /// @param _name PluginRepo name, must be ununsed
    /// TODO: Rethink if it need permission to prevent it from getting poluted, same for newPluginRepoWithVersion
    function newPluginRepo(string calldata _name, address _dev) external returns (PluginRepo) {
        return _newPluginRepo(_name, _dev);
    }

    /// @notice Create new pluginRepo in registry with `_name` and publish a first version with contract `_pluginFactoryAddress` and content `@fromHex(_contentURI)`
    /// @param _name PluginRepo name
    /// @param _initialSemanticVersion Semantic version for new pluginRepo version
    /// @param _pluginFactoryAddress address for smart contract logic for version (if set to 0, it uses last versions' contractAddress)
    /// @param _contentURI External URI for fetching new version's content
    function newPluginRepoWithVersion(
        string calldata _name,
        uint16[3] memory _initialSemanticVersion,
        address _pluginFactoryAddress,
        bytes memory _contentURI,
        address _dev
    ) public returns (PluginRepo pluginRepo) {
        pluginRepo = _newPluginRepo(_name, address(this)); // need to have permissions to create version
        pluginRepo.newVersion(_initialSemanticVersion, _pluginFactoryAddress, _contentURI);

        // setup permissions
        setPluginRepoPermissions(pluginRepo, _dev);
    }

    /// @dev Does set the required permissions for the new PluginRepo.
    /// @param pluginRepo The PluginRepo instance just created.
    /// @param dev The dev's wallet address
    function setPluginRepoPermissions(PluginRepo pluginRepo, address dev) internal {
        // set roles on the dao itself.
        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](5);

        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, pluginRepo.CREATE_VERSION_ROLE(), dev);
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, pluginRepo.UPGRADE_ROLE(), dev);
        items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, pluginRepo.ROOT_ROLE(), dev);

        // Revoke permissions from APM
        items[3] = ACLData.BulkItem(ACLData.BulkOp.Revoke, pluginRepo.ROOT_ROLE(), address(this));
        items[4] = ACLData.BulkItem(
            ACLData.BulkOp.Revoke,
            pluginRepo.CREATE_VERSION_ROLE(),
            address(this)
        );

        pluginRepo.bulk(address(pluginRepo), items);
    }

    /// @dev Does set the required permissions for the new PluginRepo.
    /// @param _name The PluginRepo instance just created.
    /// @param _initialOwner The initial owner wallet address
    function _newPluginRepo(string calldata _name, address _initialOwner)
        internal
        returns (PluginRepo pluginRepo)
    {
        if (!(bytes(_name).length > 0)) revert ApmRegEmptyName();

        pluginRepo = PluginRepo(
            createProxy(
                pluginRepoBase,
                abi.encodeWithSelector(PluginRepo.initialize.selector, _initialOwner)
            )
        );

        aragonPluginRegistry.register(_name, address(pluginRepo));
    }

    // @dev Internal helper method to set up the required base contracts.
    function setupBases() private {
        pluginRepoBase = address(new PluginRepo());
    }
}
