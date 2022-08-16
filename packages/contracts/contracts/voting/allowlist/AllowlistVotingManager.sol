// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../../core/IDAO.sol";
import "./AllowlistVoting.sol";
import "../../plugin/PluginManager.sol";

contract AllowlistManager is PluginManager {
    AllowlistVoting private allowlistVotingBase;

    constructor() {
        allowlistVotingBase = new AllowlistVoting();
    }

    function deploy(address dao, bytes memory data)
        external
        virtual
        override
        returns (address plugin, address[] memory relatedContracts)
    {
        IDAO _dao = IDAO(payable(dao));

        (
            uint256 participationRequiredPct,
            uint256 supportRequiredPct,
            uint256 minDuration,
            address[] memory allowlistVoters
        ) = abi.decode(params, (uint256, uint256, uint256, address[]));

        bytes memory init = abi.encodeWithSelector(
            WhitelistVoting.initialize.selector,
            _dao,
            _dao.trustedForwarder(),
            participationRequiredPct,
            supportRequiredPct,
            minDuration,
            allowlistVoters
        );

        relatedContracts = new address[](0);
        plugin = createProxy(dao, getImplementationAddress(), init);
    }

    function getInstallPermissions(bytes memory data)
        external
        view
        virtual
        override
        returns (Permission[] memory permissions, string[] memory helperNames)
    {
        permissions = new Permission[](5);

        // Allows plugin to call DAO with EXEC_PERMISSION
        permissions[0] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            DAO_PLACEHOLDER,
            PLUGIN_PLACEHOLDER,
            address(0),
            keccak256("EXECUTE_PERMISSION")
        );

        // Allows DAO to call plugin with MODIFY_ALLOWLIST_PERMISSION
        permissions[1] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            address(0),
            allowlistVotingBase.MODIFY_ALLOWLIST_PERMISSION_ID()
        );

        // Allows DAO to call plugin with SET_CONFIGURATION_PERMISSION
        permissions[2] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            address(0),
            allowlistVotingBase.SET_CONFIGURATION_PERMISSION_ID()
        );

        // Allows DAO to call plugin with UPGRADE_PERMISSION
        permissions[3] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            address(0),
            allowlistVotingBase.UPGRADE_PERMISSION_ID()
        );

        // Allows DAO to call plugin with SET_TRUSTED_FORWARDER_PERMISSION
        permissions[4] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            address(0),
            allowlistVotingBase.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(allowlistVotingBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "(uint256,uint256,uint256,address[])";
    }
}
