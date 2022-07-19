/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../core/component/Permissions.sol";
import "../core/DAO.sol";
import "../utils/UncheckedIncrement.sol";
import "./IPluginFactory.sol";

/// @title PluginInstaller to install plugins on a DAO.
/// @author Aragon Association - 2022
/// @notice This contract is used to create/deploy new plugins and instaling them on a DAO.
contract PluginInstaller is Permissions, UUPSUpgradeable {
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");

    address public tokenFactory;

    struct ExternalPermission {
        bytes32 role;
        address who;
    }

    struct PluginConfig {
        address factoryAddress; // Plugin deployer (factory) address
        bytes32[] pluginPermissions; // Plugin permissions to be granted to DAO
        bytes32[] daoPermissions; // Dao permission to be granted to the plugin, such as: exec_role
        ExternalPermission[] externalPermissions; // premissions to be granted before installation, and revoked after
        bytes args; // pre-determined value for stting up the plugin
    }

    event PluginInstalled(address indexed dao, address indexed pluginAddress);

    error NoRootRole();

    /// @notice Initializes the PluginInstaller
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _managingDao The DAO managing the permissions
    /// @param _tokenFactory The address of the TokenFactory
    function initialize(DAO _managingDao, address _tokenFactory) external initializer {
        __Permissions_init(_managingDao);

        tokenFactory = _tokenFactory;
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) {}

    function installPluginsOnExistingDAO(DAO dao, PluginConfig[] calldata pluginConfigs) external {
        if (!dao.hasPermission(address(dao), address(this), dao.ROOT_ROLE(), bytes("0x00")))
            revert NoRootRole();
        installPlugins(dao, pluginConfigs);
        dao.revoke(address(dao), address(this), dao.ROOT_ROLE());
    }

    function installPlugins(DAO dao, PluginConfig[] calldata pluginConfigs) public {
        address[PluginConfig.length] pluginStack;

        for (uint256 i; i < pluginConfigs.length; i = _uncheckedIncrement(i)) {
            pluginStack[i] = _installPlugin(dao, pluginConfigs[i], pluginStack);
        }
    }

    function _installPlugin(DAO dao, PluginConfig calldata pluginConfig)
        internal
        returns (address pluginAddress)
    {
        // grant external permissions
        if (pluginConfig.externalPermissions.length > 0) {
            for (
                uint256 i = 0;
                i < pluginConfig.externalPermissions.length;
                i = _uncheckedIncrement(i)
            ) {
                dao.grant(
                    address(dao),
                    pluginConfig.externalPermissions[i].who,
                    pluginConfig.externalPermissions[i].role
                );
            }
        }

        // TODO: Retrive data from APR

        // deploy new plugin for Dao
        pluginAddress = IPluginFactory(pluginConfig.factoryAddress).deploy(
            address(dao),
            pluginConfig.args
        );

        // revoke external permissions
        if (pluginConfig.externalPermissions.length > 0) {
            for (
                uint256 i = 0;
                i < pluginConfig.externalPermissions.length;
                i = _uncheckedIncrement(i)
            ) {
                dao.revoke(
                    address(dao),
                    pluginConfig.externalPermissions[i].who,
                    pluginConfig.externalPermissions[i].role
                );
            }
        }

        // Grant dao the necessary permissions on the plugin
        ACLData.BulkItem[] memory packageItems = new ACLData.BulkItem[](
            pluginConfig.pluginPermissions.length
        );
        for (uint256 i; i < pluginConfig.pluginPermissions.length; i = _uncheckedIncrement(i)) {
            packageItems[i] = ACLData.BulkItem(
                ACLData.BulkOp.Grant,
                pluginConfig.pluginPermissions[i],
                address(dao)
            );
        }
        dao.bulk(pluginAddress, packageItems);

        // Grant plugin the necessary permissions on the DAO
        ACLData.BulkItem[] memory daoItems = new ACLData.BulkItem[](
            pluginConfig.daoPermissions.length
        );
        for (uint256 i; i < pluginConfig.daoPermissions.length; i = _uncheckedIncrement(i)) {
            daoItems[i] = ACLData.BulkItem(
                ACLData.BulkOp.Grant,
                pluginConfig.daoPermissions[i],
                pluginAddress
            );
        }
        dao.bulk(address(dao), daoItems);

        emit PluginInstalled(address(dao), pluginAddress);
    }
}
