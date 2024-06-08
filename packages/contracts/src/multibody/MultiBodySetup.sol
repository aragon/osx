// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";
import {PluginUpgradeableSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/PluginUpgradeableSetup.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {DAO} from "../core/dao/DAO.sol";

import {MultiBody} from "./MultiBody.sol";
import {Executor} from "./Executor.sol";
import { AlwaysTrueCondition } from "./AlwaysTrueCondition.sol";

/// @title MyPluginSetup
/// @dev Release 1, Build 1
contract MultiBodySetup is PluginUpgradeableSetup {
    using ProxyLib for address;

    /// @notice The ID of the permission required to call the `advanceProposal` function.
    bytes32 public constant ADVANCE_PROPOSAL_PERMISSION_ID =
        keccak256("ADVANCE_PROPOSAL_PERMISSION");

    /// @notice The ID of the permission required to call the `updateStages` function.
    bytes32 public constant UPDATE_STAGES_PERMISSION_ID = keccak256("UPDATE_STAGES_PERMISSION");

    /// @notice A special address encoding permissions that are valid for any address `who` or `where`.
    address internal constant ANY_ADDR = address(type(uint160).max);

    /// @notice Constructs the `PluginUpgradeableSetup` by storing the `MyPlugin` implementation address.
    /// @dev The implementation address is used to deploy UUPS proxies referencing it and
    /// to verify the plugin on the respective block explorers.
    constructor() PluginUpgradeableSetup(address(new MultiBody())) {}

    /// @notice The ID of the permission required to call the `storeNumber` function.
    bytes32 internal constant STORE_PERMISSION_ID = keccak256("STORE_PERMISSION");

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _data
    ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
        (bytes memory pluginsMetadataABI, MultiBody.Stage[] memory stages) = abi.decode(
            _data,
            (bytes, MultiBody.Stage[])
        );

        // TODO: shall we deploy this with proxy as well ?
        Executor executor = new Executor();

        plugin = IMPLEMENTATION.deployUUPSProxy(
            abi.encodeCall(
                MultiBody.initialize,
                (IDAO(_dao), address(executor), stages, pluginsMetadataABI)
            )
        );

        PermissionLib.MultiTargetPermission[]
            memory permissions = new PermissionLib.MultiTargetPermission[](3);

        permissions[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.GrantWithCondition,
            where: plugin,
            // TODO:GIORGI If ANY_ADDR permission, PM not allowing it unless condition is set, do we want to leave this as it is in PM ?
            who: ANY_ADDR,
            condition: address(new AlwaysTrueCondition()),
            permissionId: ADVANCE_PROPOSAL_PERMISSION_ID
        });

        permissions[1] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: plugin,
            who: _dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: UPDATE_STAGES_PERMISSION_ID
        });

        permissions[2] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _dao,
            who: plugin,
            condition: PermissionLib.NO_CONDITION,
            permissionId: DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        });

        preparedSetupData.permissions = permissions;
    }

    /// @inheritdoc IPluginSetup
    /// @dev The default implementation for the initial build 1 that reverts because no earlier build exists.
    function prepareUpdate(
        address _dao,
        uint16 _fromBuild,
        SetupPayload calldata _payload
    ) external pure virtual returns (bytes memory, PreparedSetupData memory) {
        (_dao, _fromBuild, _payload);
        revert InvalidUpdatePath({fromBuild: 0, thisBuild: 1});
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        permissions = new PermissionLib.MultiTargetPermission[](2);

        permissions[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: _payload.plugin,
            who: ANY_ADDR,
            condition: PermissionLib.NO_CONDITION,
            permissionId: ADVANCE_PROPOSAL_PERMISSION_ID
        });

        permissions[1] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _payload.plugin,
            who: _dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: UPDATE_STAGES_PERMISSION_ID
        });

        permissions[2] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: _dao,
            who: _payload.plugin,
            condition: PermissionLib.NO_CONDITION,
            permissionId: DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        });
    }
}
