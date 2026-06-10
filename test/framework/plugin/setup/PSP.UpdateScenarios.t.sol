// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {PSPBaseTest} from "./PSP.Base.sol";
import {PluginSetupProcessor} from "../../../../src/framework/plugin/setup/PluginSetupProcessor.sol";
import {
    PluginSetupRef,
    hashHelpers,
    _getAppliedSetupId,
    _getPluginInstallationId
} from "../../../../src/framework/plugin/setup/PluginSetupProcessorHelpers.sol";
import {PluginRepo} from "../../../../src/framework/plugin/repo/PluginRepo.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PluginUUPSUpgradeable} from "@aragon/osx-commons-contracts/src/plugin/PluginUUPSUpgradeable.sol";

/// @notice End-to-end install-and-update scenarios mirroring the TS
/// `Update scenarios` describe block. Each scenario:
/// 1. Installs a specific build (V1, V2, or V3)
/// 2. Optionally chains updates through subsequent builds
/// 3. Asserts the plugin's implementation address matches the expected version,
///    that the appliedSetupId in PSP state matches the latest, and that block
///    advancement tracks correctly.
contract PSPUpdateScenariosTest is PSPBaseTest {
    // Helpers --------------------------------------------------------------

    function _installBuild(uint16 build) internal returns (address plugin, address[] memory helpers) {
        (address p, IPluginSetup.PreparedSetupData memory data) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(build, ""));
        plugin = p;
        helpers = data.helpers;

        _grantApplyInstallation(owner);
        _grantPspRoot();
        psp.applyInstallation(
            address(dao),
            PluginSetupProcessor.ApplyInstallationParams({
                pluginSetupRef: _ref(build),
                plugin: p,
                permissions: data.permissions,
                helpersHash: hashHelpers(data.helpers)
            })
        );
        // Plugin's UPGRADE_PLUGIN_PERMISSION must be on PSP for future updates.
        dao.grant(p, address(psp), UPGRADE_PLUGIN_PERMISSION_ID);
        _grantApplyUpdate(owner);
        _revokePspRoot();
        vm.roll(block.number + 1);
    }

    function _update(uint16 fromBuild, uint16 toBuild, address plugin, address[] memory currentHelpers)
        internal
        returns (address[] memory newHelpers)
    {
        (bytes memory initData, IPluginSetup.PreparedSetupData memory data) = psp.prepareUpdate(
            address(dao),
            PluginSetupProcessor.PrepareUpdateParams({
                currentVersionTag: PluginRepo.Tag({release: 1, build: fromBuild}),
                newVersionTag: PluginRepo.Tag({release: 1, build: toBuild}),
                pluginSetupRepo: uupsRepo,
                setupPayload: IPluginSetup.SetupPayload({plugin: plugin, currentHelpers: currentHelpers, data: ""})
            })
        );

        _grantPspRoot();
        psp.applyUpdate(
            address(dao),
            PluginSetupProcessor.ApplyUpdateParams({
                plugin: plugin,
                pluginSetupRef: _ref(toBuild),
                initData: initData,
                permissions: data.permissions,
                helpersHash: hashHelpers(data.helpers)
            })
        );
        _revokePspRoot();
        vm.roll(block.number + 1);

        newHelpers = data.helpers;
    }

    function _expectedImpl(uint16 build) internal view returns (address) {
        if (build == 1) return setupV1.implementation();
        if (build == 2) return setupV2.implementation();
        if (build == 3) return setupV3.implementation();
        if (build == 4) return setupV4.implementation();
        revert("unknown build");
    }

    function _readImplSlot(address proxy) internal view returns (address) {
        bytes32 IMPL_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
        return address(uint160(uint256(vm.load(proxy, IMPL_SLOT))));
    }

    function _expectedAppliedId(uint16 build, address[] memory helpers) internal view returns (bytes32) {
        return _getAppliedSetupId(_ref(build), hashHelpers(helpers));
    }

    function _assertState(address plugin, uint16 expectedBuild, address[] memory expectedHelpers) internal {
        assertEq(_readImplSlot(plugin), _expectedImpl(expectedBuild), "implementation slot");
        bytes32 id = _getPluginInstallationId(address(dao), plugin);
        (, bytes32 currentAppliedId) = psp.states(id);
        assertEq(currentAppliedId, _expectedAppliedId(expectedBuild, expectedHelpers), "appliedSetupId");
    }

    // V1 installed --------------------------------------------------------

    function test_v1Install_pointsToV1Implementation() public {
        (address plugin, address[] memory helpers) = _installBuild(1);
        _assertState(plugin, 1, helpers);
    }

    function test_v1ThenV2_endsAtV2() public {
        (address plugin, address[] memory h1) = _installBuild(1);
        address[] memory h2 = _update(1, 2, plugin, h1);
        _assertState(plugin, 2, h2);
    }

    function test_v1ThenV2ThenV3_endsAtV3() public {
        (address plugin, address[] memory h1) = _installBuild(1);
        address[] memory h2 = _update(1, 2, plugin, h1);
        address[] memory h3 = _update(2, 3, plugin, h2);
        _assertState(plugin, 3, h3);
    }

    function test_v1ThenV3_skipsBuild2() public {
        (address plugin, address[] memory h1) = _installBuild(1);
        address[] memory h3 = _update(1, 3, plugin, h1);
        _assertState(plugin, 3, h3);
    }

    function test_v1ThenV2ThenV4_endsAtV4SharingV3Impl() public {
        (address plugin, address[] memory h1) = _installBuild(1);
        address[] memory h2 = _update(1, 2, plugin, h1);
        // V4 reuses V3's impl, so V2→V4 still upgrades to a NEW impl address
        // (from V2's impl to V3's impl). Lock in.
        address implBefore = _readImplSlot(plugin);
        assertEq(implBefore, _expectedImpl(2));

        address[] memory h4 = _update(2, 4, plugin, h2);

        address implAfter = _readImplSlot(plugin);
        assertEq(implAfter, _expectedImpl(4));
        // V4 impl == V3 impl by construction.
        assertEq(implAfter, _expectedImpl(3));

        _assertState(plugin, 4, h4);
    }

    // V2 installed --------------------------------------------------------

    function test_v2Install_pointsToV2Implementation() public {
        (address plugin, address[] memory helpers) = _installBuild(2);
        _assertState(plugin, 2, helpers);
    }

    function test_v2ThenV3_endsAtV3() public {
        (address plugin, address[] memory h2) = _installBuild(2);
        address[] memory h3 = _update(2, 3, plugin, h2);
        _assertState(plugin, 3, h3);
    }

    // V3 installed --------------------------------------------------------

    function test_v3Install_pointsToV3Implementation() public {
        (address plugin, address[] memory helpers) = _installBuild(3);
        _assertState(plugin, 3, helpers);
    }

    function test_v3ThenV4_implementationStaysAtV3Address() public {
        // F11 closer at scenario level: V3→V4 changes the recorded build but
        // the ERC1967 implementation slot must be bit-identical (since V4's
        // setup.implementation() == V3's setup.implementation()).
        (address plugin, address[] memory h3) = _installBuild(3);
        bytes32 implBefore = vm.load(plugin, bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1));

        address[] memory h4 = _update(3, 4, plugin, h3);

        bytes32 implAfter = vm.load(plugin, bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1));
        assertEq(implBefore, implAfter, "F11: impl slot must not change when currentImpl == newImpl");

        // appliedSetupId tracks the new build.
        _assertState(plugin, 4, h4);
    }
}
