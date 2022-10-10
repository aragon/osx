// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../voting/allowlist/AllowlistVoting.sol";
import "../voting/erc20/ERC20Voting.sol";
import "../tokens/GovernanceERC20.sol";
import "../tokens/GovernanceWrappedERC20.sol";
import "../registry/DAORegistry.sol";
import "../core/DAO.sol";
import "../utils/Proxy.sol";
import "../tokens/MerkleMinter.sol";
import "./TokenFactory.sol";

import {PluginRepo} from "../plugin/PluginRepo.sol";
import {PluginSetupProcessor} from "../plugin/PluginSetupProcessor.sol";

/// @title DAOFactory
/// @author Aragon Association - 2022
/// @notice This contract is used to create a DAO.
contract DAOFactory {
    using Address for address;
    using Clones for address;

    error MintArrayLengthMismatch(uint256 receiversArrayLength, uint256 amountsArrayLength);

    address public daoBase;

    DAORegistry public daoRegistry;
    PluginSetupProcessor public pluginSetupProcessor;

    struct DAOConfig {
        string name;
        address trustedForwarder;
        bytes metadata;
    }

    /// @notice Emitted when a new DAO is created.
    /// @param name The DAO name.
    /// @param token The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) governance token address or `address(0)` if no token was created.
    /// @param voting The address of the voting component of the new DAO.
    event DAOCreated(string name, address indexed token, address indexed voting);

    /// @notice The constructor setting the registry and token factory address and creating the base contracts for the factory to clone from.
    /// @param _registry The DAO registry to register the DAO by its name.
    /// @param _pluginSetupProcessor The addres of PluginSetupProcessor.
    constructor(DAORegistry _registry, PluginSetupProcessor _pluginSetupProcessor) {
        daoRegistry = _registry;
        pluginSetupProcessor = _pluginSetupProcessor;

        daoBase = address(new DAO());
    }

    struct PluginSettings {
        address pluginSetup;
        PluginRepo pluginSetupRepo;
        bytes data;
    }

    function createDao(DAOConfig calldata _daoConfig, PluginSettings[] calldata pluginSettings)
        external
    {
        // Create DAO
        DAO dao = _createDAO(_daoConfig);

        // Grant `ROOT_PERMISSION_ID` to `pluginSetupProcessor`.
        dao.grant(address(dao), address(pluginSetupProcessor), dao.ROOT_PERMISSION_ID());

        for (uint256 i = 0; i < pluginSettings.length; i++) {
            (
                address plugin,
                ,
                BulkPermissionsLib.ItemMultiTarget[] memory permissions
            ) = pluginSetupProcessor.prepareInstallation(
                    address(dao),
                    pluginSettings[i].pluginSetup,
                    pluginSettings[i].pluginSetupRepo,
                    pluginSettings[i].data
                );

            pluginSetupProcessor.applyInstallation(
                address(dao),
                pluginSettings[i].pluginSetup,
                plugin,
                permissions
            );
        }

        // Revoke `ROOT_PERMISSION_ID` from `pluginSetupProcessor`.
        dao.revoke(address(dao), address(pluginSetupProcessor), dao.ROOT_PERMISSION_ID());

        // set the rest of DAO's permissions
        _setDAOPermissions(dao);

        // Register DAO
        daoRegistry.register(dao, msg.sender, _daoConfig.name);
    }

    /// @notice Creates a new DAO.
    /// @param _daoConfig The name and metadata hash of the DAO it creates.
    function _createDAO(DAOConfig calldata _daoConfig) internal returns (DAO dao) {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));

        // initialize dao with the `ROOT_PERMISSION_ID` permission as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this), _daoConfig.trustedForwarder);
    }

    /// @notice Sets the required permissions for the new DAO.
    /// @param _dao The DAO instance just created.
    function _setDAOPermissions(DAO _dao) internal {
        // set permissionIds on the dao itself.
        BulkPermissionsLib.ItemSingleTarget[]
            memory items = new BulkPermissionsLib.ItemSingleTarget[](8);

        // Grant DAO all the permissions required
        items[0] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.SET_METADATA_PERMISSION_ID()
        );
        items[1] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.WITHDRAW_PERMISSION_ID()
        );
        items[2] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.UPGRADE_PERMISSION_ID()
        );
        items[3] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.ROOT_PERMISSION_ID()
        );
        items[4] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID()
        );
        items[5] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );

        // Revoke permissions from factory
        items[6] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Revoke,
            address(this),
            _dao.ROOT_PERMISSION_ID()
        );

        _dao.bulkOnSingleTarget(address(_dao), items);
    }
}
