// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../../core/IDAO.sol";
import "../../plugin/PluginManager.sol";
import "./AllowlistVoting.sol";

contract AddressListVotingManager is PluginManager {
    /// @notice The logic contract of the `AddressListVoting`.
    AllowlistVoting private addresslistVotingBase;

    constructor() {
        addresslistVotingBase = new AllowlistVoting();
    }

    /// @inheritdoc PluginManager
    function deploy(address dao, bytes memory data)
        external
        virtual
        override
        returns (address plugin, address[] memory relatedContracts)
    {
        IDAO _dao = IDAO(payable(dao));

        // Decode the passed parameters.
        (
            uint256 minTurnout,
            uint256 minSupport,
            uint256 minDuration,
            address[] memory allowlistVoters
        ) = abi.decode(data, (uint256, uint256, uint256, address[]));

        // Encode the parameters that will be passed to `initialize()` on the Plugin
        bytes memory initData = abi.encodeWithSelector(
            AllowlistVoting.initialize.selector,
            _dao,
            _dao.getTrustedForwarder(),
            minTurnout,
            minSupport,
            minDuration,
            allowlistVoters
        );

        // Since this plugin do not deply any related contract, we set `relatedContracts` to an empty array.
        relatedContracts = new address[](0);

        // Deploy the Plugin itself as a proxy, make it point to the implementation logic
        // and pass the initialization parameteres.
        plugin = createProxy(dao, getImplementationAddress(), initData);
    }

    /// @inheritdoc PluginManager
    function getInstallPermissions(bytes memory)
        external
        view
        virtual
        override
        returns (RequestedPermission[] memory permissions, string[] memory helperNames)
    {
        permissions = new RequestedPermission[](5);
        helperNames = new string[](0);

        address NO_ORACLE = address(0);

        // Grant the `EXECUTE_PERMISSION_ID` permission on the installing DAO to the plugin.
        permissions[0] = buildPermission(
            BulkPermissionsLib.Operation.Grant,
            DAO_PLACEHOLDER,
            PLUGIN_PLACEHOLDER,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        // Grant the `MODIFY_ALLOWLIST_PERMISSION_ID` permission on the plugin to the installing DAO.
        permissions[1] = buildPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            addresslistVotingBase.MODIFY_ALLOWLIST_PERMISSION_ID()
        );

        // Grant the `SET_CONFIGURATION_PERMISSION_ID` permission on the plugin to the installing DAO.
        permissions[2] = buildPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            addresslistVotingBase.SET_CONFIGURATION_PERMISSION_ID()
        );

        // Grant the `UPGRADE_PERMISSION_ID` permission on the plugin to the installing DAO.
        permissions[3] = buildPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            addresslistVotingBase.UPGRADE_PERMISSION_ID()
        );

        // Grant the `SET_TRUSTED_FORWARDER_PERMISSION_ID` permission on the plugin to the installing DAO.
        permissions[4] = buildPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            addresslistVotingBase.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );
    }

    /// @inheritdoc PluginManager
    function getImplementationAddress() public view virtual override returns (address) {
        return address(addresslistVotingBase);
    }

    /// @inheritdoc PluginManager
    function deployABI() external view virtual override returns (string memory) {
        return
            "(uint256 participationRequiredPct, uint256 supportRequiredPct, uint256 minDuration, address[] allowlistVoters)";
    }
}
