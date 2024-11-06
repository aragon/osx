// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {IProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/IProtocolVersion.sol";
import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";

import {DAO} from "../../core/dao/DAO.sol";
import {PluginRepo} from "../plugin/repo/PluginRepo.sol";
import {PluginSetupProcessor} from "../plugin/setup/PluginSetupProcessor.sol";
import {hashHelpers, PluginSetupRef} from "../plugin/setup/PluginSetupProcessorHelpers.sol";
import {DAORegistry} from "./DAORegistry.sol";

/// @title DAOFactory
/// @author Aragon X - 2022-2023
/// @notice This contract is used to create a DAO.
/// @custom:security-contact sirt@aragon.org
contract DAOFactory is ERC165, ProtocolVersion {
    using ProxyLib for address;

    /// @notice The DAO base contract, to be used for creating new `DAO`s via `createERC1967Proxy` function.
    address public immutable daoBase;

    /// @notice The DAO registry listing the `DAO` contracts created via this contract.
    DAORegistry public immutable daoRegistry;

    /// @notice The plugin setup processor for installing plugins on the newly created `DAO`s.
    PluginSetupProcessor public immutable pluginSetupProcessor;

    // Cache permission IDs for optimized access
    bytes32 internal immutable ROOT_PERMISSION_ID;
    bytes32 internal immutable UPGRADE_DAO_PERMISSION_ID;
    bytes32 internal immutable SET_TRUSTED_FORWARDER_PERMISSION_ID;
    bytes32 internal immutable SET_METADATA_PERMISSION_ID;
    bytes32 internal immutable REGISTER_STANDARD_CALLBACK_PERMISSION_ID;
    bytes32 internal immutable EXECUTE_PERMISSION_ID;
    bytes32 internal immutable APPLY_INSTALLATION_PERMISSION_ID;

    /// @notice The container for the DAO settings to be set during the DAO initialization.
    /// @param trustedForwarder The address of the trusted forwarder required for meta transactions.
    /// @param daoURI The DAO uri used with [EIP-4824](https://eips.ethereum.org/EIPS/eip-4824).
    /// @param subdomain The ENS subdomain to be registered for the DAO contract.
    /// @param metadata The metadata of the DAO.
    struct DAOSettings {
        address trustedForwarder;
        string daoURI;
        string subdomain;
        bytes metadata;
    }

    /// @notice The container with the information required to install a plugin on the DAO.
    /// @param pluginSetupRef The `PluginSetupRepo` address of the plugin and the version tag.
    /// @param data The bytes-encoded data containing the input parameters for the installation as specified in the plugin's build metadata JSON file.
    struct PluginSettings {
        PluginSetupRef pluginSetupRef;
        bytes data;
    }

    /// @notice The container with the information about an installed plugin on a DAO.
    /// @param plugin The address of the deployed plugin instance.
    /// @param preparedSetupData The applied preparedSetupData which contains arrays of helpers and permissions.
    struct InstalledPlugin {
        address plugin;
        IPluginSetup.PreparedSetupData preparedSetupData;
    }

    /// @notice Thrown if `PluginSettings` array is empty, and no plugin is provided.
    error NoPluginProvided();

    /// @notice The constructor setting the registry and plugin setup processor and creating the base contracts for the factory.
    /// @param _registry The DAO registry to register the DAO by its name.
    /// @param _pluginSetupProcessor The address of PluginSetupProcessor.
    constructor(DAORegistry _registry, PluginSetupProcessor _pluginSetupProcessor) {
        daoRegistry = _registry;
        pluginSetupProcessor = _pluginSetupProcessor;

        DAO dao = new DAO();
        daoBase = address(dao);

        // Cache permission IDs for reduced gas usage in future function calls
        ROOT_PERMISSION_ID = dao.ROOT_PERMISSION_ID();
        UPGRADE_DAO_PERMISSION_ID = dao.UPGRADE_DAO_PERMISSION_ID();
        SET_TRUSTED_FORWARDER_PERMISSION_ID = dao.SET_TRUSTED_FORWARDER_PERMISSION_ID();
        SET_METADATA_PERMISSION_ID = dao.SET_METADATA_PERMISSION_ID();
        REGISTER_STANDARD_CALLBACK_PERMISSION_ID = dao.REGISTER_STANDARD_CALLBACK_PERMISSION_ID();
        EXECUTE_PERMISSION_ID = dao.EXECUTE_PERMISSION_ID();
        APPLY_INSTALLATION_PERMISSION_ID = pluginSetupProcessor.APPLY_INSTALLATION_PERMISSION_ID();
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == type(IProtocolVersion).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice Creates a new DAO, registers it in the DAO registry, and optionally installs plugins via the plugin setup processor.
    /// @dev If `_pluginSettings` is empty, the caller is granted `EXECUTE_PERMISSION` on the DAO.
    /// @param _daoSettings The settings to configure during DAO initialization.
    /// @param _pluginSettings An array containing plugin references and settings. If provided, each plugin is installed
    /// after the DAO creation.
    /// @return createdDao The address of the newly created DAO instance.
    /// @return installedPlugins An array of `InstalledPlugin` structs, each containing the plugin address and associated
    /// helper contracts and permissions, if plugins were installed; otherwise, an empty array.
    function createDao(
        DAOSettings calldata _daoSettings,
        PluginSettings[] calldata _pluginSettings
    ) external returns (DAO createdDao, InstalledPlugin[] memory installedPlugins) {
        // Create DAO.
        createdDao = _createDAO(_daoSettings);

        // Register DAO.
        daoRegistry.register(createdDao, msg.sender, _daoSettings.subdomain);

        // Cache address to save gas
        address daoAddress = address(createdDao);

        // Install plugins if plugin settings are provided.
        if (_pluginSettings.length != 0) {
            installedPlugins = new InstalledPlugin[](_pluginSettings.length);

            // Cache address to save gas
            address pluginSetupProcessorAddress = address(pluginSetupProcessor);

            // Grant the temporary permissions.
            // Grant Temporarily `ROOT_PERMISSION` to `pluginSetupProcessor`.
            createdDao.grant(daoAddress, pluginSetupProcessorAddress, ROOT_PERMISSION_ID);

            // Grant Temporarily `APPLY_INSTALLATION_PERMISSION` on `pluginSetupProcessor` to this `DAOFactory`.
            createdDao.grant(
                pluginSetupProcessorAddress,
                address(this),
                APPLY_INSTALLATION_PERMISSION_ID
            );

            // Install plugins on the newly created DAO.
            for (uint256 i; i < _pluginSettings.length; ++i) {
                // Prepare plugin.
                (
                    address plugin,
                    IPluginSetup.PreparedSetupData memory preparedSetupData
                ) = pluginSetupProcessor.prepareInstallation(
                        daoAddress,
                        PluginSetupProcessor.PrepareInstallationParams(
                            _pluginSettings[i].pluginSetupRef,
                            _pluginSettings[i].data
                        )
                    );

                // Apply plugin.
                pluginSetupProcessor.applyInstallation(
                    daoAddress,
                    PluginSetupProcessor.ApplyInstallationParams(
                        _pluginSettings[i].pluginSetupRef,
                        plugin,
                        preparedSetupData.permissions,
                        hashHelpers(preparedSetupData.helpers)
                    )
                );

                installedPlugins[i] = InstalledPlugin(plugin, preparedSetupData);
            }

            // Revoke the temporarily granted permissions.
            // Revoke Temporarily `ROOT_PERMISSION` from `pluginSetupProcessor`.
            createdDao.revoke(daoAddress, pluginSetupProcessorAddress, ROOT_PERMISSION_ID);

            // Revoke `APPLY_INSTALLATION_PERMISSION` on `pluginSetupProcessor` from this `DAOFactory` .
            createdDao.revoke(
                pluginSetupProcessorAddress,
                address(this),
                APPLY_INSTALLATION_PERMISSION_ID
            );
        } else {
            // if no plugin setting is provided, grant EXECUTE_PERMISSION_ID to msg.sender
            createdDao.grant(daoAddress, msg.sender, EXECUTE_PERMISSION_ID);
        }

        // Set the rest of DAO's permissions.
        _setDAOPermissions(daoAddress);

        // Revoke Temporarily `ROOT_PERMISSION_ID` that implicitly granted to this `DaoFactory`
        // at the create dao step `address(this)` being the initial owner of the new created DAO.
        createdDao.revoke(daoAddress, address(this), ROOT_PERMISSION_ID);

        return (createdDao, installedPlugins);
    }

    /// @notice Deploys a new DAO `ERC1967` proxy, and initialize it with this contract as the initial owner.
    /// @param _daoSettings The trusted forwarder, name and metadata hash of the DAO it creates.
    function _createDAO(DAOSettings calldata _daoSettings) internal returns (DAO dao) {
        // Create a DAO proxy and initialize it with the DAOFactory (`address(this)`) as the initial owner.
        // As a result, the DAOFactory has `ROOT_PERMISSION_`ID` permission on the DAO.
        dao = DAO(
            payable(
                daoBase.deployUUPSProxy(
                    abi.encodeCall(
                        DAO.initialize,
                        (
                            _daoSettings.metadata,
                            address(this),
                            _daoSettings.trustedForwarder,
                            _daoSettings.daoURI
                        )
                    )
                )
            )
        );
    }

    /// @notice Sets the required permissions for the new DAO.
    /// @param _daoAddress The address of the DAO just created.
    function _setDAOPermissions(address _daoAddress) internal {
        // set permissionIds on the dao itself.
        PermissionLib.SingleTargetPermission[]
            memory items = new PermissionLib.SingleTargetPermission[](5);

        // Grant DAO all the permissions required
        items[0] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            _daoAddress,
            ROOT_PERMISSION_ID
        );
        items[1] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            _daoAddress,
            UPGRADE_DAO_PERMISSION_ID
        );
        items[2] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            _daoAddress,
            SET_TRUSTED_FORWARDER_PERMISSION_ID
        );
        items[3] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            _daoAddress,
            SET_METADATA_PERMISSION_ID
        );
        items[4] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            _daoAddress,
            REGISTER_STANDARD_CALLBACK_PERMISSION_ID
        );

        DAO(payable(_daoAddress)).applySingleTargetPermissions(_daoAddress, items);
    }
}
