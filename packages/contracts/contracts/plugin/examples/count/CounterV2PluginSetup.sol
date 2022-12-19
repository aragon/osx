// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {IDAO} from "../../../core/IDAO.sol";
import {PluginSetup} from "../../PluginSetup.sol";
import {IPluginSetup} from "../../IPluginSetup.sol";
import {MultiplyHelper} from "./MultiplyHelper.sol";
import {CounterV2} from "./CounterV2.sol";

/// @title CounterV2PluginSetup
/// @author Aragon Association - 2022
/// @notice The setup contract of the `CounterV2` plugin.
contract CounterV2PluginSetup is PluginSetup {
    using Clones for address;

    // For testing purposes, the contracts below are public.
    MultiplyHelper public multiplyHelperBase;
    CounterV2 public counterBase;

    address private constant NO_ORACLE = address(0);

    // MultiplyHelper doesn't change. so dev decides to pass the old one.
    constructor(MultiplyHelper _helper) {
        multiplyHelperBase = _helper;
        counterBase = new CounterV2();
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallationDataABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num, uint newVariable)";
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(address _dao, bytes memory _data)
        external
        virtual
        override
        returns (address plugin, PreparedDependency memory preparedDependency)
    {
        // Decode the parameters from the UI
        (address _multiplyHelper, uint256 _num) = abi.decode(_data, (address, uint256));

        address multiplyHelper = _multiplyHelper;

        if (_multiplyHelper == address(0)) {
            // deploy helper without our proxy..
            multiplyHelper = address(new ERC1967Proxy(address(multiplyHelperBase), bytes("")));
        }

        bytes memory initData = abi.encodeWithSelector(
            bytes4(keccak256("initialize(address,address,uint256)")),
            _dao,
            multiplyHelper,
            _num
        );

        PermissionLib.ItemMultiTarget[] memory permissions = new PermissionLib.ItemMultiTarget[](
            _multiplyHelper == address(0) ? 3 : 2
        );
        address[] memory helpers = new address[](1);

        // deploy
        plugin = createERC1967Proxy(address(counterBase), initData);

        // set permissions
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            _dao,
            plugin,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        if (_multiplyHelper == address(0)) {
            permissions[2] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Grant,
                multiplyHelper,
                plugin,
                NO_ORACLE,
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }

        // add helpers
        helpers[0] = multiplyHelper;

        preparedDependency.helpers = helpers;
        preparedDependency.permissions = permissions;

        return (plugin, preparedDependency);
    }

    /// @inheritdoc IPluginSetup
    function prepareUpdateDataABI() external view virtual override returns (string memory) {
        return "(uint _newVariable)";
    }

    /// @inheritdoc IPluginSetup
    function prepareUpdate(
        address _dao,
        uint16 _currentBuild,
        SetupPayload calldata _payload
    )
        external
        view
        override
        returns (bytes memory initData, PreparedDependency memory preparedDependency)
    {
        uint256 _newVariable;

        // if (_oldVersion[0] == 1 && _oldVersion[1] == 0) { // TODO:GIORGI
        if (_currentBuild == 1) {
            (_newVariable) = abi.decode(_payload.data, (uint256));
            initData = abi.encodeWithSelector(
                bytes4(keccak256("setNewVariable(uint256)")),
                _newVariable
            );
        }

        PermissionLib.ItemMultiTarget[] memory permissions = new PermissionLib.ItemMultiTarget[](1);
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _payload.plugin,
            NO_ORACLE,
            multiplyHelperBase.MULTIPLY_PERMISSION_ID()
        );

        // if another helper is deployed, put it inside activeHelpers + put old ones as well.
        address[] memory activeHelpers = new address[](1);
        activeHelpers[0] = _payload.currentHelpers[0];

        preparedDependency.helpers = activeHelpers;
        preparedDependency.permissions = permissions;
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallationDataABI() external view virtual override returns (string memory) {
        return "";
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(address _dao, SetupPayload calldata _payload)
        external
        virtual
        override
        returns (PermissionLib.ItemMultiTarget[] memory permissions, IDAO.Action[] memory actions)
    {
        (actions);
        
        permissions = new PermissionLib.ItemMultiTarget[](
            _payload.currentHelpers.length != 0 ? 3 : 2
        );

        // set permissions
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _payload.plugin,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            NO_ORACLE,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        if (_payload.currentHelpers.length != 0) {
            permissions[2] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Revoke,
                _payload.currentHelpers[0],
                _payload.plugin,
                NO_ORACLE,
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() external view virtual override returns (address) {
        return address(counterBase);
    }
}
