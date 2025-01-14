// SPDX-License-Identifier: AGPL-3.0-or-later

/* solhint-disable one-contract-per-file */
pragma solidity ^0.8.8;

import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/PluginSetup.sol";

import {PluginUpgradeableSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/PluginUpgradeableSetup.sol";

import {mockPermissions, mockHelpers, mockPluginProxy} from "../PluginMockData.sol";
import {PluginUUPSUpgradeableV1Mock, PluginUUPSUpgradeableV2Mock, PluginUUPSUpgradeableV3Mock} from "./PluginUUPSUpgradeableMock.sol";

abstract contract MockedHelper is IPluginSetup {
    // Used for mocking in tests
    uint160 private helpersCount;
    uint160 private permissionMockLowerIndex;
    uint160 private permissionMockUpperIndex;

    // Helper emits to help with testing
    event InstallationPrepared(address dao, bytes data);
    event UninstallationPrepared(address dao, SetupPayload payload);
    event UpdatePrepared(address dao, uint16 build, SetupPayload payload);

    // helper functions to help with testing
    function emitInstallationPrepared(address dao, bytes memory data) internal {
        emit InstallationPrepared(dao, data);
    }

    function emitUpdatePrepared(address dao, uint16 build, SetupPayload memory payload) internal {
        emit UpdatePrepared(dao, build, payload);
    }

    function emitUninstallationPrepared(address dao, SetupPayload memory payload) internal {
        emit UninstallationPrepared(dao, payload);
    }

    // called externally to allow mock behaviour
    function mockPermissionIndexes(uint160 _lowerIndex, uint160 _upperIndex) public {
        permissionMockLowerIndex = _lowerIndex;
        permissionMockUpperIndex = _upperIndex;
    }

    function mockHelperCount(uint160 _helpersCount) public {
        helpersCount = _helpersCount;
    }

    // called internally from the setup contracts
    function _mockHelpers(uint160 _helpersCount) internal view returns (address[] memory) {
        return mockHelpers(helpersCount != 0 ? helpersCount : _helpersCount);
    }

    function _mockPermissions(
        uint160 lower,
        uint160 upper,
        PermissionLib.Operation _op
    ) internal view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        return
            mockPermissions(
                permissionMockLowerIndex != 0 ? permissionMockLowerIndex : lower,
                permissionMockUpperIndex != 0 ? permissionMockUpperIndex : upper,
                _op
            );
    }

    function reset() public {
        permissionMockLowerIndex = 0;
        permissionMockUpperIndex = 0;
        helpersCount = 0;
    }
}

contract PluginUUPSUpgradeableSetupV1Mock is PluginUpgradeableSetup, MockedHelper {
    constructor(address implementation) PluginUpgradeableSetup(implementation) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _data
    ) public virtual override returns (address plugin, PreparedSetupData memory preparedSetupData) {
        plugin = mockPluginProxy(implementation(), _dao);
        preparedSetupData.helpers = _mockHelpers(2);
        preparedSetupData.permissions = _mockPermissions(0, 2, PermissionLib.Operation.Grant);

        emitInstallationPrepared(_dao, _data);
    }

    /// @inheritdoc IPluginSetup
    /// @dev The default implementation for the initial build 1 that reverts because no earlier build exists.
    function prepareUpdate(
        address _dao,
        uint16 _fromBuild,
        SetupPayload calldata _payload
    ) external virtual returns (bytes memory, PreparedSetupData memory) {
        (_dao, _fromBuild, _payload);
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    ) external virtual override returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        (_dao, _payload);
        permissions = _mockPermissions(0, 1, PermissionLib.Operation.Revoke);

        emitUninstallationPrepared(_dao, _payload);
    }
}

contract PluginUUPSUpgradeableSetupV1MockBad is PluginUUPSUpgradeableSetupV1Mock {
    constructor(address implementation) PluginUUPSUpgradeableSetupV1Mock(implementation) {}

    function prepareInstallation(
        address _dao,
        bytes memory _data
    ) public override returns (address plugin, PreparedSetupData memory preparedSetupData) {
        (_dao);
        plugin = address(0); // The bad behaviour is returning the same address over and over again
        preparedSetupData.helpers = mockHelpers(1);
        preparedSetupData.permissions = super._mockPermissions(0, 1, PermissionLib.Operation.Grant);

        emitInstallationPrepared(_dao, _data);
    }
}

contract PluginUUPSUpgradeableSetupV2Mock is PluginUUPSUpgradeableSetupV1Mock {
    constructor(address implementation) PluginUUPSUpgradeableSetupV1Mock(implementation) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _data
    ) public virtual override returns (address plugin, PreparedSetupData memory preparedSetupData) {
        plugin = mockPluginProxy(implementation(), _dao);
        preparedSetupData.helpers = super._mockHelpers(2);
        preparedSetupData.permissions = super._mockPermissions(0, 2, PermissionLib.Operation.Grant);

        emitInstallationPrepared(_dao, _data);
    }

    function prepareUpdate(
        address _dao,
        uint16 _currentBuild,
        SetupPayload calldata _payload
    )
        public
        virtual
        override
        returns (bytes memory initData, PreparedSetupData memory preparedSetupData)
    {
        (_dao, _payload);

        // Update from V1
        if (_currentBuild == 1) {
            preparedSetupData.helpers = super._mockHelpers(2);
            initData = abi.encodeCall(PluginUUPSUpgradeableV2Mock.initializeV1toV2, ());
            preparedSetupData.permissions = super._mockPermissions(
                1,
                2,
                PermissionLib.Operation.Grant
            );
        }

        emitUpdatePrepared(_dao, _currentBuild, _payload);
    }
}

contract PluginUUPSUpgradeableSetupV3Mock is PluginUUPSUpgradeableSetupV2Mock {
    constructor(address implementation) PluginUUPSUpgradeableSetupV2Mock(implementation) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _data
    ) public virtual override returns (address plugin, PreparedSetupData memory preparedSetupData) {
        plugin = mockPluginProxy(implementation(), _dao);
        preparedSetupData.helpers = super._mockHelpers(3);
        preparedSetupData.permissions = super._mockPermissions(0, 3, PermissionLib.Operation.Grant);

        emitInstallationPrepared(_dao, _data);
    }

    function prepareUpdate(
        address _dao,
        uint16 _currentBuild,
        SetupPayload calldata _payload
    )
        public
        virtual
        override
        returns (bytes memory initData, PreparedSetupData memory preparedSetupData)
    {
        (_dao, _payload);

        // Update from V1
        if (_currentBuild == 1) {
            preparedSetupData.helpers = super._mockHelpers(3);
            initData = abi.encodeCall(PluginUUPSUpgradeableV3Mock.initializeV1toV3, ());
            preparedSetupData.permissions = super._mockPermissions(
                1,
                3,
                PermissionLib.Operation.Grant
            );
        }

        // Update from V2
        if (_currentBuild == 2) {
            preparedSetupData.helpers = super._mockHelpers(3);
            initData = abi.encodeCall(PluginUUPSUpgradeableV3Mock.initializeV2toV3, ());
            preparedSetupData.permissions = super._mockPermissions(
                2,
                3,
                PermissionLib.Operation.Grant
            );
        }

        emitUpdatePrepared(_dao, _currentBuild, _payload);
    }
}

/// @dev With this plugin setup, the plugin base implementation doesn't change.
/// This setup is a good example when you want to design a new plugin setup
/// which uses the same base implementation(doesn't update the logic contract)
/// but applies new/modifier permissions on it.

contract PluginUUPSUpgradeableSetupV4Mock is PluginUUPSUpgradeableSetupV3Mock {
    constructor(address implementation) PluginUUPSUpgradeableSetupV3Mock(implementation) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _data
    ) public virtual override returns (address plugin, PreparedSetupData memory preparedSetupData) {
        plugin = mockPluginProxy(implementation(), _dao);
        preparedSetupData.helpers = super._mockHelpers(3);
        preparedSetupData.permissions = super._mockPermissions(0, 3, PermissionLib.Operation.Grant);

        emitInstallationPrepared(_dao, _data);
    }

    function prepareUpdate(
        address _dao,
        uint16 _currentBuild,
        SetupPayload calldata _payload
    )
        public
        virtual
        override
        returns (bytes memory initData, PreparedSetupData memory preparedSetupData)
    {
        // If one tries to upgrade from v3 to this(v4), developer of this v4
        // knows that logic contract doesn't change as he specified the same address
        // in `implementation()`. This means this update should only include returning
        // the desired updated permissions. PluginSetupProcessor will take care of
        // not calling `upgradeTo` on the plugin in such cases.
        if (_currentBuild == 3) {
            preparedSetupData.permissions = super._mockPermissions(
                3,
                4,
                PermissionLib.Operation.Grant
            );
        }
        // If the update happens from those that have different implementation addresses(v1,v2)
        // proxy(plugin) contract should be upgraded to the new base implementation which requires(not always though)
        // returning the `initData` that will be called upon `upradeToAndCall` by plugin setup processor.
        // NOTE that dev is free to do what he wishes.
        else if (_currentBuild == 1 || _currentBuild == 2) {
            (initData, preparedSetupData) = super.prepareUpdate(_dao, _currentBuild, _payload);
            // Even for this case, dev might decide to modify the permissions..
            preparedSetupData.permissions = super._mockPermissions(
                4,
                5,
                PermissionLib.Operation.Grant
            );
        }

        emitUpdatePrepared(_dao, _currentBuild, _payload);
    }
}
