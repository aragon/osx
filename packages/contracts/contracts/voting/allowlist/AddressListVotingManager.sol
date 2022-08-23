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
        public
        virtual
        override
        returns (address plugin, Permission.ItemMultiTarget[] memory permissions)
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

        // Deploy the Plugin itself as a proxy, make it point to the implementation logic
        // and pass the initialization parameteres.
        plugin = createProxy(dao, getImplementationAddress(), initData);

        permissions = new Permission.ItemMultiTarget[](5);

        address NO_ORACLE = address(0);

        // Grant the `EXECUTE_PERMISSION_ID` permission of the installing DAO to the plugin.
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            dao,
            plugin,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        // Grant the `MODIFY_ALLOWLIST_PERMISSION_ID` permission of the plugin to the installing DAO.
        permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            dao,
            NO_ORACLE,
            addresslistVotingBase.MODIFY_ALLOWLIST_PERMISSION_ID()
        );

        // Grant the `SET_CONFIGURATION_PERMISSION_ID` permission of the plugin to the installing DAO.
        permissions[2] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            dao,
            NO_ORACLE,
            addresslistVotingBase.SET_CONFIGURATION_PERMISSION_ID()
        );

        // Grant the `UPGRADE_PERMISSION_ID` permission of the plugin to the installing DAO.
        permissions[3] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            dao,
            NO_ORACLE,
            addresslistVotingBase.UPGRADE_PERMISSION_ID()
        );

        // Grant the `SET_TRUSTED_FORWARDER_PERMISSION_ID` permission of the plugin to the installing DAO.
        permissions[4] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            dao,
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
