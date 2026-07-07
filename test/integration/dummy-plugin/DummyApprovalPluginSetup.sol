// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {PluginUpgradeableSetup} from "../../../src/common/plugin/setup/PluginUpgradeableSetup.sol";
import {IPluginSetup} from "../../../src/common/plugin/setup/IPluginSetup.sol";
import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";
import {DummyApprovalPluginV1, DummyApprovalPluginV2} from "./DummyApprovalPlugin.sol";

/// @notice ────────── DUMMY PLUGIN SETUP — TEST FIXTURE ONLY ──────────
///
/// PluginUpgradeableSetup wiring for the V1 dummy. Deploys a UUPS proxy
/// per install and wires the 3 required permissions:
///   - proposer  → PROPOSE_PERMISSION on the plugin
///   - approver  → APPROVE_PERMISSION  on the plugin
///   - plugin    → EXECUTE_PERMISSION  on the DAO (so the plugin can
///                 forward proposal actions through DAO.execute)
contract DummyApprovalPluginSetupV1 is PluginUpgradeableSetup {
    using ProxyLib for address;

    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");

    constructor() PluginUpgradeableSetup(address(new DummyApprovalPluginV1())) {}

    function prepareInstallation(address _dao, bytes memory _data)
        external
        override
        returns (address plugin, PreparedSetupData memory preparedSetupData)
    {
        (address proposer, address approver) = abi.decode(_data, (address, address));

        plugin = implementation().deployUUPSProxy(abi.encodeCall(DummyApprovalPluginV1.initialize, (IDAO(_dao))));

        preparedSetupData.permissions = new PermissionLib.MultiTargetPermission[](3);
        preparedSetupData.permissions[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: plugin,
            who: proposer,
            condition: PermissionLib.NO_CONDITION,
            permissionId: DummyApprovalPluginV1(plugin).PROPOSE_PERMISSION_ID()
        });
        preparedSetupData.permissions[1] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: plugin,
            who: approver,
            condition: PermissionLib.NO_CONDITION,
            permissionId: DummyApprovalPluginV1(plugin).APPROVE_PERMISSION_ID()
        });
        preparedSetupData.permissions[2] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _dao,
            who: plugin,
            condition: PermissionLib.NO_CONDITION,
            permissionId: EXECUTE_PERMISSION_ID
        });
    }

    function prepareUpdate(address _dao, uint16 _fromBuild, SetupPayload calldata _payload)
        external
        virtual
        returns (bytes memory initData, PreparedSetupData memory preparedSetupData)
    {
        // V1 is the initial build — nothing to update FROM.
        revert InvalidUpdatePath({fromBuild: _fromBuild, thisBuild: 1});
    }

    function prepareUninstallation(address _dao, SetupPayload calldata _payload)
        external
        view
        override
        returns (PermissionLib.MultiTargetPermission[] memory perms)
    {
        perms = new PermissionLib.MultiTargetPermission[](1);
        perms[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: _dao,
            who: _payload.plugin,
            condition: PermissionLib.NO_CONDITION,
            permissionId: EXECUTE_PERMISSION_ID
        });
    }
}

/// @notice V2 setup — same install wiring but uses the V2 plugin impl
/// (which exposes `initializeFrom`). Implements `prepareUpdate` so PSP's
/// V1→V2 update path is exercisable.
contract DummyApprovalPluginSetupV2 is PluginUpgradeableSetup {
    using ProxyLib for address;

    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");

    constructor() PluginUpgradeableSetup(address(new DummyApprovalPluginV2())) {}

    function prepareInstallation(address _dao, bytes memory _data)
        external
        override
        returns (address plugin, PreparedSetupData memory preparedSetupData)
    {
        (address proposer, address approver) = abi.decode(_data, (address, address));

        // V2 inherits `initialize(IDAO)` from V1; reference the V1 selector.
        plugin = implementation().deployUUPSProxy(abi.encodeCall(DummyApprovalPluginV1.initialize, (IDAO(_dao))));

        preparedSetupData.permissions = new PermissionLib.MultiTargetPermission[](3);
        preparedSetupData.permissions[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: plugin,
            who: proposer,
            condition: PermissionLib.NO_CONDITION,
            permissionId: DummyApprovalPluginV1(plugin).PROPOSE_PERMISSION_ID()
        });
        preparedSetupData.permissions[1] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: plugin,
            who: approver,
            condition: PermissionLib.NO_CONDITION,
            permissionId: DummyApprovalPluginV1(plugin).APPROVE_PERMISSION_ID()
        });
        preparedSetupData.permissions[2] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _dao,
            who: plugin,
            condition: PermissionLib.NO_CONDITION,
            permissionId: EXECUTE_PERMISSION_ID
        });
    }

    function prepareUpdate(address _dao, uint16 _fromBuild, SetupPayload calldata _payload)
        external
        virtual
        returns (bytes memory initData, PreparedSetupData memory preparedSetupData)
    {
        if (_fromBuild != 1) revert InvalidUpdatePath({fromBuild: _fromBuild, thisBuild: 2});

        // PSP's `applyUpdate` runs `upgradeToAndCall(newImpl, initData)` on
        // the existing proxy. We pass `initializeFrom(fromBuild)` so the V2
        // impl's reinitializer runs and bumps `_initialized` from 1 → 2.
        initData = abi.encodeCall(DummyApprovalPluginV2.initializeFrom, (_fromBuild));

        // No permission deltas to apply — the V1 grants (PROPOSE, APPROVE,
        // EXECUTE) all remain valid on the V2 plugin (same proxy address).
        preparedSetupData.helpers = new address[](0);
        preparedSetupData.permissions = new PermissionLib.MultiTargetPermission[](0);
        _dao;
        _payload;
    }

    function prepareUninstallation(address _dao, SetupPayload calldata _payload)
        external
        view
        override
        returns (PermissionLib.MultiTargetPermission[] memory perms)
    {
        perms = new PermissionLib.MultiTargetPermission[](1);
        perms[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: _dao,
            who: _payload.plugin,
            condition: PermissionLib.NO_CONDITION,
            permissionId: EXECUTE_PERMISSION_ID
        });
    }
}
