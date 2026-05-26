// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {PluginUUPSUpgradeableSetupV1Mock} from "./PluginUUPSUpgradeableSetupMock.sol";
import {PluginSetupProcessor} from "../../../../src/framework/plugin/setup/PluginSetupProcessor.sol";
import {PluginSetupRef} from "../../../../src/framework/plugin/setup/PluginSetupProcessorHelpers.sol";
import {PluginRepo} from "../../../../src/framework/plugin/repo/PluginRepo.sol";

/// @notice A setup mock whose `prepareInstallation` re-enters
/// `PSP.prepareInstallation` exactly once, targeting a different setup.
/// Used to verify the PSP's handling of recursive prepare calls from a
/// PluginSetup contract.
/// @dev DO NOT USE IN PRODUCTION.
contract PluginUUPSUpgradeableReenteringSetupMock is PluginUUPSUpgradeableSetupV1Mock {
    PluginSetupProcessor public immutable psp;
    PluginRepo public immutable reentryRepo;
    uint8 public immutable reentryRelease;
    uint16 public immutable reentryBuild;

    bool private reentered;

    constructor(
        address implementation,
        PluginSetupProcessor _psp,
        PluginRepo _reentryRepo,
        uint8 _release,
        uint16 _build
    ) PluginUUPSUpgradeableSetupV1Mock(implementation) {
        psp = _psp;
        reentryRepo = _reentryRepo;
        reentryRelease = _release;
        reentryBuild = _build;
    }

    function prepareInstallation(address _dao, bytes memory _data)
        public
        override
        returns (address plugin, PreparedSetupData memory preparedSetupData)
    {
        if (!reentered) {
            reentered = true;
            psp.prepareInstallation(
                _dao,
                PluginSetupProcessor.PrepareInstallationParams({
                    pluginSetupRef: PluginSetupRef({
                        versionTag: PluginRepo.Tag({release: reentryRelease, build: reentryBuild}),
                        pluginSetupRepo: reentryRepo
                    }),
                    data: ""
                })
            );
        }
        return super.prepareInstallation(_dao, _data);
    }
}
