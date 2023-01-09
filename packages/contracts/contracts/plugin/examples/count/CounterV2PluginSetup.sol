// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
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
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {
        // Decode the parameters from the UI
        (address _multiplyHelper, uint256 _num) = abi.decode(_data, (address, uint256));

        address multiplyHelper = _multiplyHelper;

        if (_multiplyHelper == address(0)) {
            multiplyHelper = createERC1967Proxy(address(multiplyHelperBase), bytes(""));            
        }

        bytes memory initData = abi.encodeWithSelector(
            bytes4(keccak256("initialize(address,address,uint256)")),
            _dao,
            multiplyHelper,
            _num
        );

        permissions = new PermissionLib.ItemMultiTarget[](_multiplyHelper == address(0) ? 3 : 2);
        helpers = new address[](1);

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

        return (plugin, helpers, permissions);
    }

    /// @inheritdoc IPluginSetup
    function prepareUpdateDataABI() external view virtual override returns (string memory) {
        return "(uint _newVariable)";
    }

    /// @inheritdoc IPluginSetup
    function prepareUpdate(
        address _dao,
        address _plugin, // proxy
        address[] memory _helpers,
        uint16[3] calldata _oldVersion,
        bytes memory _data
    )
        external
        view
        override
        returns (
            address[] memory activeHelpers,
            bytes memory initData,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {
        uint256 _newVariable;

        if (_oldVersion[0] == 1 && _oldVersion[1] == 0) {
            (_newVariable) = abi.decode(_data, (uint256));
            initData = abi.encodeWithSelector(
                bytes4(keccak256("setNewVariable(uint256)")),
                _newVariable
            );
        }

        permissions = new PermissionLib.ItemMultiTarget[](1);
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            multiplyHelperBase.MULTIPLY_PERMISSION_ID()
        );

        // if another helper is deployed, put it inside activeHelpers + put old ones as well.
        activeHelpers = new address[](1);
        activeHelpers[0] = _helpers[0];
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallationDataABI() external view virtual override returns (string memory) {
        return "";
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address dao,
        address plugin,
        address[] calldata activeHelpers,
        bytes calldata
    ) external virtual override returns (PermissionLib.ItemMultiTarget[] memory permissions) {
        permissions = new PermissionLib.ItemMultiTarget[](activeHelpers.length != 0 ? 3 : 2);

        // set permissions
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            dao,
            plugin,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            plugin,
            dao,
            NO_ORACLE,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        if (activeHelpers.length != 0) {
            permissions[2] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Revoke,
                activeHelpers[0],
                plugin,
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
